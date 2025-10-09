import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PaymentReminder {
  id: number;
  customer_id: number;
  policy_number: string;
  customer_name: string;
  phone_number: string;
  premium_amount: number;
  premium_period: string;
  last_payment_date: string | null;
  next_due_date: string;
  last_reminder_sent: string | null;
  reminder_days_before: number;
  enabled: boolean;
}

function parseDate(dateStr: string): Date {
  const parts = dateStr.split('-');
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDaysDifference(date1: Date, date2: Date): number {
  const diffTime = date2.getTime() - date1.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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

    const today = new Date();
    const todayStr = formatDate(today);

    console.log('Checking payment reminders for:', todayStr);

    const { data: reminders, error: fetchError } = await supabase
      .from('payment_reminders')
      .select('*')
      .eq('enabled', true);

    if (fetchError) {
      console.error('Error fetching payment reminders:', fetchError);
      throw fetchError;
    }

    const sentCount = { success: 0, failed: 0, skipped: 0 };
    const results = [];

    for (const reminder of (reminders || []) as PaymentReminder[]) {
      try {
        const dueDate = parseDate(reminder.next_due_date);
        const daysUntilDue = getDaysDifference(today, dueDate);

        console.log(`Checking ${reminder.customer_name}: Due in ${daysUntilDue} days (threshold: ${reminder.reminder_days_before})`);

        if (daysUntilDue <= reminder.reminder_days_before && daysUntilDue >= 0) {
          if (reminder.last_reminder_sent === todayStr) {
            console.log(`Already sent payment reminder today for ${reminder.customer_name}`);
            sentCount.skipped++;
            continue;
          }

          const message = `Dear ${reminder.customer_name}, your premium payment of $${reminder.premium_amount} for policy ${reminder.policy_number} is due on ${reminder.next_due_date}. Please make your payment to keep your policy active. Thank you - Stone River Insurance.`;

          const smsResponse = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              phoneNumber: reminder.phone_number,
              message: message,
            }),
          });

          const smsResult = await smsResponse.json();

          if (smsResult.status === 'S' || smsResponse.ok) {
            await supabase
              .from('payment_reminders')
              .update({ 
                last_reminder_sent: todayStr,
                updated_at: new Date().toISOString() 
              })
              .eq('id', reminder.id);

            await supabase
              .from('reminder_logs')
              .insert({
                reminder_type: 'payment',
                customer_id: reminder.customer_id,
                phone_number: reminder.phone_number,
                message: message,
                status: 'sent',
              });

            sentCount.success++;
            results.push({ 
              customer: reminder.customer_name, 
              policy: reminder.policy_number,
              daysUntilDue: daysUntilDue,
              status: 'sent' 
            });
            console.log(`Payment reminder sent to ${reminder.customer_name}`);
          } else {
            throw new Error(smsResult.remarks || 'SMS send failed');
          }
        } else if (daysUntilDue < 0) {
          console.log(`Payment overdue for ${reminder.customer_name}`);
          sentCount.skipped++;
        } else {
          sentCount.skipped++;
        }
      } catch (error) {
        console.error(`Error sending payment reminder for ${reminder.customer_name}:`, error);
        
        await supabase
          .from('reminder_logs')
          .insert({
            reminder_type: 'payment',
            customer_id: reminder.customer_id,
            phone_number: reminder.phone_number,
            message: `Payment reminder for policy ${reminder.policy_number}`,
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
          });

        sentCount.failed++;
        results.push({ 
          customer: reminder.customer_name, 
          policy: reminder.policy_number,
          status: 'failed', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    console.log('Payment reminders check complete:', sentCount);

    return new Response(
      JSON.stringify({
        success: true,
        date: todayStr,
        summary: sentCount,
        results: results,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in check-payment-reminders function:', error);
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