import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface StatusChangeRequest {
  assignees: {
    name: string;
    email: string;
  }[];
  taskTitle: string;
  projectName: string;
  newStatus: string;
  changedBy?: string;
}

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'backlog': 'Backlog',
    'todo': 'To Do',
    'in-progress': 'In Progress',
    'review': 'Review',
    'blocked': 'Blocked',
    'done': 'Done'
  };
  return labels[status] || status;
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'done': return '#22c55e';
    case 'review': return '#8b5cf6';
    default: return '#6b7280';
  }
};

const getStatusEmoji = (status: string): string => {
  switch (status) {
    case 'done': return '✅';
    case 'review': return '👀';
    default: return '📋';
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      assignees, 
      taskTitle, 
      projectName,
      newStatus,
      changedBy,
    }: StatusChangeRequest = await req.json();

    console.log(`Sending status change notification for task: ${taskTitle} to ${assignees.length} assignee(s)`);

    const statusLabel = getStatusLabel(newStatus);
    const statusColor = getStatusColor(newStatus);
    const statusEmoji = getStatusEmoji(newStatus);

    const emailPromises = assignees.map(async (assignee) => {
      const emailResponse = await resend.emails.send({
        from: "Task Updates <onboarding@resend.dev>",
        to: [assignee.email],
        subject: `${statusEmoji} Task moved to ${statusLabel}: ${taskTitle}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Task Status Updated ${statusEmoji}</h1>
            </div>
            
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
              <p style="font-size: 16px; margin-bottom: 20px;">
                Hi <strong>${assignee.name}</strong>,
              </p>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                ${changedBy ? `<strong>${changedBy}</strong> has` : 'The'} updated the status of a task you're assigned to.
              </p>
              
              <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #111827;">${taskTitle}</h2>
                
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 14px; color: #6b7280;">New Status:</span>
                  <span style="display: inline-flex; align-items: center; gap: 6px; background: ${statusColor}20; color: ${statusColor}; padding: 6px 12px; border-radius: 20px; font-weight: 600; font-size: 14px;">
                    <span style="width: 8px; height: 8px; border-radius: 50%; background: ${statusColor};"></span>
                    ${statusLabel}
                  </span>
                </div>
                
                <p style="margin: 16px 0 0 0; font-size: 14px; color: #6b7280;">
                  Project: <strong style="color: #374151;">${projectName}</strong>
                </p>
              </div>
              
              ${newStatus === 'review' ? `
              <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                  <strong>👀 Review Needed:</strong> This task is ready for review. Please take a look when you have a moment.
                </p>
              </div>
              ` : ''}
              
              ${newStatus === 'done' ? `
              <div style="background: #dcfce7; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #166534;">
                  <strong>🎉 Task Completed:</strong> Great work! This task has been marked as done.
                </p>
              </div>
              ` : ''}
              
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

    console.log("All status change notification emails sent successfully:", results);

    return new Response(JSON.stringify({ success: true, data: results }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending status change notification emails:", error);
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
