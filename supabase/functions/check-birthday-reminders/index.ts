import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BirthdayReminder {
  id: number;
  customer_id: number;
  participant_id: number;
  participant_name: string;
  date_of_birth: string;
  phone_number: string;
  last_sent_date: string | null;
  enabled: boolean;
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
    const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
    const todayDay = String(today.getDate()).padStart(2, '0');
    const todayStr = `${today.getFullYear()}-${todayMonth}-${todayDay}`;

    console.log('Checking birthday reminders for:', todayStr);

    const { data: reminders, error: fetchError } = await supabase
      .from('birthday_reminders')
      .select('*')
      .eq('enabled', true);

    if (fetchError) {
      console.error('Error fetching reminders:', fetchError);
      throw fetchError;
    }

    const sentCount = { success: 0, failed: 0, skipped: 0 };
    const results = [];

    for (const reminder of (reminders || []) as BirthdayReminder[]) {
      try {
        const dob = reminder.date_of_birth;
        const dobParts = dob.split('-');
        
        if (dobParts.length !== 3) {
          console.log(`Invalid DOB format for ${reminder.participant_name}: ${dob}`);
          sentCount.skipped++;
          continue;
        }

        const dobMonth = dobParts[1];
        const dobDay = dobParts[2];

        if (dobMonth === todayMonth && dobDay === todayDay) {
          if (reminder.last_sent_date === todayStr) {
            console.log(`Already sent birthday reminder today for ${reminder.participant_name}`);
            sentCount.skipped++;
            continue;
          }

          const message = `Happy Birthday ${reminder.participant_name}! Wishing you a wonderful day filled with joy and happiness. From Stone River Insurance.`;

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
              .from('birthday_reminders')
              .update({ 
                last_sent_date: todayStr,
                updated_at: new Date().toISOString() 
              })
              .eq('id', reminder.id);

            await supabase
              .from('reminder_logs')
              .insert({
                reminder_type: 'birthday',
                customer_id: reminder.customer_id,
                phone_number: reminder.phone_number,
                message: message,
                status: 'sent',
              });

            sentCount.success++;
            results.push({ name: reminder.participant_name, status: 'sent' });
            console.log(`Birthday SMS sent to ${reminder.participant_name}`);
          } else {
            throw new Error(smsResult.remarks || 'SMS send failed');
          }
        }
      } catch (error) {
        console.error(`Error sending birthday SMS for ${reminder.participant_name}:`, error);
        
        await supabase
          .from('reminder_logs')
          .insert({
            reminder_type: 'birthday',
            customer_id: reminder.customer_id,
            phone_number: reminder.phone_number,
            message: `Birthday reminder for ${reminder.participant_name}`,
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
          });

        sentCount.failed++;
        results.push({ 
          name: reminder.participant_name, 
          status: 'failed', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    console.log('Birthday reminders check complete:', sentCount);

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
    console.error('Error in check-birthday-reminders function:', error);
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