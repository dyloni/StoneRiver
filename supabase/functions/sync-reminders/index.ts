import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Customer {
  id: number;
  policy_number: string;
  first_name: string;
  surname: string;
  phone: string;
  total_premium: number;
  premium_period: string;
  inception_date: string;
  participants: Participant[];
  status: string;
}

interface Participant {
  id: number;
  firstName: string;
  surname: string;
  dateOfBirth: string;
  relationship: string;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calculateNextDueDate(inceptionDate: string, premiumPeriod: string): string {
  const inception = new Date(inceptionDate);
  const today = new Date();

  let nextDue = new Date(inception);

  if (premiumPeriod === 'Monthly' || !premiumPeriod) {
    while (nextDue <= today) {
      nextDue.setMonth(nextDue.getMonth() + 1);
    }
  } else if (premiumPeriod === 'Quarterly') {
    while (nextDue <= today) {
      nextDue.setMonth(nextDue.getMonth() + 3);
    }
  } else if (premiumPeriod === 'Annually') {
    while (nextDue <= today) {
      nextDue.setFullYear(nextDue.getFullYear() + 1);
    }
  }

  return formatDate(nextDue);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting reminder sync...');

    const { data: customers, error: fetchError } = await supabase
      .from('customers')
      .select('*');

    if (fetchError) {
      console.error('Error fetching customers:', fetchError);
      throw fetchError;
    }

    let birthdayCount = 0;
    let paymentCount = 0;

    for (const customer of (customers || []) as Customer[]) {
      if (!customer.phone || customer.status === 'Cancelled') {
        continue;
      }

      const participants = customer.participants || [];

      for (const participant of participants) {
        if (!participant.dateOfBirth) continue;

        const { data: existingBirthday } = await supabase
          .from('birthday_reminders')
          .select('id')
          .eq('customer_id', customer.id)
          .eq('participant_id', participant.id)
          .maybeSingle();

        const birthdayData = {
          customer_id: customer.id,
          participant_id: participant.id,
          participant_name: `${participant.firstName} ${participant.surname}`,
          date_of_birth: participant.dateOfBirth,
          phone_number: customer.phone,
          enabled: true,
          updated_at: new Date().toISOString(),
        };

        if (existingBirthday) {
          await supabase
            .from('birthday_reminders')
            .update(birthdayData)
            .eq('id', existingBirthday.id);
        } else {
          await supabase
            .from('birthday_reminders')
            .insert(birthdayData);
          birthdayCount++;
        }
      }

      if (customer.total_premium > 0 && customer.inception_date) {
        const { data: existingPayment } = await supabase
          .from('payment_reminders')
          .select('id')
          .eq('customer_id', customer.id)
          .maybeSingle();

        const { data: payments } = await supabase
          .from('payments')
          .select('*')
          .eq('customer_id', customer.id)
          .order('date', { ascending: false })
          .limit(1);

        const lastPaymentDate = payments && payments.length > 0
          ? payments[0].date
          : null;

        const nextDueDate = calculateNextDueDate(
          customer.inception_date,
          customer.premium_period || 'Monthly'
        );

        const paymentData = {
          customer_id: customer.id,
          policy_number: customer.policy_number || '',
          customer_name: `${customer.first_name} ${customer.surname}`,
          phone_number: customer.phone,
          premium_amount: customer.total_premium,
          premium_period: customer.premium_period || 'Monthly',
          last_payment_date: lastPaymentDate,
          next_due_date: nextDueDate,
          reminder_days_before: 3,
          enabled: true,
          updated_at: new Date().toISOString(),
        };

        if (existingPayment) {
          await supabase
            .from('payment_reminders')
            .update(paymentData)
            .eq('id', existingPayment.id);
        } else {
          await supabase
            .from('payment_reminders')
            .insert(paymentData);
          paymentCount++;
        }
      }
    }

    console.log(`Sync complete: ${birthdayCount} birthday reminders, ${paymentCount} payment reminders created`);

    return new Response(
      JSON.stringify({
        success: true,
        birthdayReminders: birthdayCount,
        paymentReminders: paymentCount,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in sync-reminders function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
