import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const sanitizeHtml = (text: string): string => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const parseUserAgent = (ua: string): string => {
  if (!ua) return "Unknown device";
  
  let browser = "Unknown browser";
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Microsoft Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";
  
  let os = "Unknown OS";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  
  return `${browser} on ${os}`;
};

interface AlertRequest {
  userEmail: string;
  userName: string;
  eventType: "new_device" | "multiple_failed_attempts" | "password_changed" | "mfa_disabled";
  userAgent: string;
  timestamp: string;
}

const getAlertContent = (eventType: string, device: string, timestamp: string) => {
  switch (eventType) {
    case "new_device":
      return {
        emoji: "🔔",
        title: "New Device Sign-In",
        message: `Your account was signed into from a new device: <strong>${device}</strong>`,
        severity: "warning",
        color: "#f59e0b",
        bgColor: "#fef3c7",
        borderColor: "#fcd34d",
      };
    case "multiple_failed_attempts":
      return {
        emoji: "⚠️",
        title: "Multiple Failed Sign-In Attempts",
        message: "Multiple failed sign-in attempts were detected on your account.",
        severity: "danger",
        color: "#ef4444",
        bgColor: "#fee2e2",
        borderColor: "#fca5a5",
      };
    case "password_changed":
      return {
        emoji: "🔑",
        title: "Password Changed",
        message: "Your account password was recently changed.",
        severity: "info",
        color: "#6366f1",
        bgColor: "#e0e7ff",
        borderColor: "#a5b4fc",
      };
    case "mfa_disabled":
      return {
        emoji: "🛡️",
        title: "Two-Factor Authentication Disabled",
        message: "Two-factor authentication was disabled on your account.",
        severity: "danger",
        color: "#ef4444",
        bgColor: "#fee2e2",
        borderColor: "#fca5a5",
      };
    default:
      return {
        emoji: "ℹ️",
        title: "Security Alert",
        message: "A security event occurred on your account.",
        severity: "info",
        color: "#6b7280",
        bgColor: "#f3f4f6",
        borderColor: "#d1d5db",
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { userEmail, userName, eventType, userAgent, timestamp }: AlertRequest = await req.json();

    if (!userEmail || !eventType) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const device = sanitizeHtml(parseUserAgent(userAgent || ""));
    const safeName = sanitizeHtml(userName || "User");
    const formattedTime = new Date(timestamp || Date.now()).toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
    const alert = getAlertContent(eventType, device, formattedTime);

    console.log(`Sending ${eventType} alert to ${userEmail}`);

    const emailResponse = await resend.emails.send({
      from: "Security Alerts <onboarding@resend.dev>",
      to: [userEmail],
      subject: `${alert.emoji} ${alert.title} — Action may be required`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
          <div style="background: linear-gradient(135deg, ${alert.color} 0%, ${alert.color}cc 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${alert.emoji} ${alert.title}</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              Hi <strong>${safeName}</strong>,
            </p>
            
            <div style="background: ${alert.bgColor}; border: 1px solid ${alert.borderColor}; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: ${alert.color};">
                ${alert.message}
              </p>
            </div>
            
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Event Details</h3>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #6b7280; width: 120px;">Event</td>
                  <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 600;">${alert.title}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #6b7280; border-top: 1px solid #f3f4f6;">Device</td>
                  <td style="padding: 8px 0; font-size: 14px; color: #111827; border-top: 1px solid #f3f4f6;">${device}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #6b7280; border-top: 1px solid #f3f4f6;">Time</td>
                  <td style="padding: 8px 0; font-size: 14px; color: #111827; border-top: 1px solid #f3f4f6;">${formattedTime}</td>
                </tr>
              </table>
            </div>
            
            <p style="font-size: 14px; color: #374151; margin: 20px 0;">
              If this was you, no action is needed. If you don't recognize this activity, we recommend:
            </p>
            <ul style="font-size: 14px; color: #374151; margin: 0 0 20px 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Changing your password immediately</li>
              <li style="margin-bottom: 8px;">Enabling two-factor authentication</li>
              <li>Reviewing your recent account activity</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${Deno.env.get("SITE_URL") || "https://your-app.lovable.app"}/settings" 
                 style="background: linear-gradient(135deg, ${alert.color} 0%, ${alert.color}cc 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
                Review Account Settings
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #9ca3af; text-align: center;">
              This is an automated security alert. You're receiving this because of activity on your account.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Security alert email sent:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending security alert email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
