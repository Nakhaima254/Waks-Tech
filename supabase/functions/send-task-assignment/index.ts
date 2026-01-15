import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TaskAssignmentRequest {
  assignees: {
    name: string;
    email: string;
  }[];
  taskTitle: string;
  taskDescription?: string;
  projectName: string;
  dueDate?: string;
  priority: string;
  assignerName?: string;
}

const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'critical': return '#dc2626';
    case 'high': return '#ea580c';
    case 'medium': return '#eab308';
    case 'low': return '#22c55e';
    default: return '#6b7280';
  }
};

const getPriorityLabel = (priority: string): string => {
  switch (priority) {
    case 'critical': return 'Critical';
    case 'high': return 'High';
    case 'medium': return 'Medium';
    case 'low': return 'Low';
    default: return priority;
  }
};

// Security: Sanitize user-provided content to prevent HTML injection
const sanitizeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Security: Verify JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { 
      assignees, 
      taskTitle, 
      taskDescription, 
      projectName, 
      dueDate, 
      priority,
      assignerName 
    }: TaskAssignmentRequest = await req.json();

    // Security: Validate required fields
    if (!assignees || !Array.isArray(assignees) || assignees.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid assignees' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!taskTitle || !projectName || !priority) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Security: Verify recipients are actual team members
    const { data: validEmails } = await supabase
      .from('team_members')
      .select('email')
      .in('email', assignees.map(a => a.email));

    if (!validEmails || validEmails.length !== assignees.length) {
      return new Response(JSON.stringify({ error: 'Invalid recipients - must be team members' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log(`Sending task assignment emails for task: ${taskTitle} to ${assignees.length} assignee(s)`);

    const priorityColor = getPriorityColor(priority);
    const priorityLabel = getPriorityLabel(priority);

    // Security: Sanitize all user-provided content
    const safeTaskTitle = sanitizeHtml(taskTitle);
    const safeTaskDescription = taskDescription ? sanitizeHtml(taskDescription) : null;
    const safeProjectName = sanitizeHtml(projectName);
    const safeAssignerName = assignerName ? sanitizeHtml(assignerName) : null;

    const emailPromises = assignees.map(async (assignee) => {
      const safeName = sanitizeHtml(assignee.name);
      
      const emailResponse = await resend.emails.send({
        from: "Task Assignment <onboarding@resend.dev>",
        to: [assignee.email],
        subject: `New Task Assigned: ${safeTaskTitle}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">New Task Assigned 📋</h1>
            </div>
            
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
              <p style="font-size: 16px; margin-bottom: 20px;">
                Hi <strong>${safeName}</strong>,
              </p>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                ${safeAssignerName ? `<strong>${safeAssignerName}</strong> has` : 'You have been'} assigned you a new task in <strong>"${safeProjectName}"</strong>.
              </p>
              
              <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #111827;">${safeTaskTitle}</h2>
                
                ${safeTaskDescription ? `<p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px;">${safeTaskDescription}</p>` : ''}
                
                <div style="display: flex; gap: 16px; flex-wrap: wrap;">
                  <div style="display: inline-flex; align-items: center; gap: 6px;">
                    <span style="width: 10px; height: 10px; border-radius: 50%; background: ${priorityColor};"></span>
                    <span style="font-size: 14px; color: #374151;"><strong>Priority:</strong> ${priorityLabel}</span>
                  </div>
                  
                  ${dueDate ? `
                  <div style="font-size: 14px; color: #374151;">
                    <strong>Due:</strong> ${new Date(dueDate).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                  ` : ''}
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
                You received this email because you were assigned to a task.
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

    console.log("All emails sent successfully:", results);

    return new Response(JSON.stringify({ success: true, data: results }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending task assignment emails:", error);
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
