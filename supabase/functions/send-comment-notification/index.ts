import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CommentNotificationRequest {
  assignees: {
    name: string;
    email: string;
  }[];
  taskTitle: string;
  projectName: string;
  commentAuthor: string;
  commentContent: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      assignees, 
      taskTitle, 
      projectName,
      commentAuthor,
      commentContent,
    }: CommentNotificationRequest = await req.json();

    console.log(`Sending comment notification for task: ${taskTitle} to ${assignees.length} assignee(s)`);

    const emailPromises = assignees.map(async (assignee) => {
      const emailResponse = await resend.emails.send({
        from: "Task Comments <onboarding@resend.dev>",
        to: [assignee.email],
        subject: `New comment on: ${taskTitle}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">New Comment 💬</h1>
            </div>
            
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
              <p style="font-size: 16px; margin-bottom: 20px;">
                Hi <strong>${assignee.name}</strong>,
              </p>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                <strong>${commentAuthor}</strong> commented on the task <strong>"${taskTitle}"</strong> in <strong>"${projectName}"</strong>.
              </p>
              
              <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                  <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 14px; flex-shrink: 0;">
                    ${commentAuthor.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p style="margin: 0 0 4px 0; font-weight: 600; color: #111827;">${commentAuthor}</p>
                    <p style="margin: 0; color: #374151; font-size: 14px;">${commentContent}</p>
                  </div>
                </div>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${Deno.env.get('SITE_URL') || 'https://your-app.lovable.app'}" 
                   style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
                  View Task
                </a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <p style="font-size: 14px; color: #6b7280; text-align: center;">
                You received this email because you are assigned to this task.
              </p>
            </div>
          </body>
          </html>
        `,
      });

      console.log(`Email sent to ${assignee.email}:`, emailResponse);
      return { email: assignee.email, response: emailResponse };
    });

    const results = await Promise.all(emailPromises);

    console.log("All comment notification emails sent successfully:", results);

    return new Response(JSON.stringify({ success: true, data: results }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending comment notification emails:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
