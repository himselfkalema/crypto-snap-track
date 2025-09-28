import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'https://esm.sh/resend@2.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const payload = await req.text()
    const headers = Object.fromEntries(req.headers)
    const wh = new Webhook(hookSecret)
    
    const {
      user,
      email_data: { token, token_hash, redirect_to, email_action_type },
    } = wh.verify(payload, headers) as {
      user: {
        email: string
      }
      email_data: {
        token: string
        token_hash: string
        redirect_to: string
        email_action_type: string
        site_url: string
      }
    }

    console.log(`Sending ${email_action_type} email to ${user.email}`)

    const html = generateEmailHTML({
      supabase_url: Deno.env.get('SUPABASE_URL') ?? '',
      token_hash,
      redirect_to,
      email_action_type,
    })

    let subject = 'Welcome to Crypto Snap Track!'
    let fromName = 'Crypto Snap Track'
    
    if (email_action_type === 'signup') {
      subject = 'Verify your Crypto Snap Track account'
    } else if (email_action_type === 'recovery') {
      subject = 'Reset your Crypto Snap Track password'
    }

    const { error } = await resend.emails.send({
      from: `${fromName} <onboarding@resend.dev>`,
      to: [user.email],
      subject,
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      throw error
    }

    console.log('Email sent successfully')
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
    
  } catch (error) {
    console.error('Error in send-custom-email function:', error)
    return new Response(
      JSON.stringify({
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
})

function generateEmailHTML({
  supabase_url,
  email_action_type,
  redirect_to,
  token_hash,
}: {
  supabase_url: string
  email_action_type: string
  redirect_to: string
  token_hash: string
}) {
  const isSignup = email_action_type === 'signup'
  const isRecovery = email_action_type === 'recovery'
  
  const verifyUrl = `${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isSignup ? 'Verify your Crypto Snap Track account' : isRecovery ? 'Reset your Crypto Snap Track password' : 'Crypto Snap Track verification'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f6f9fc; }
    .container { max-width: 560px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 40px; }
    .logo { font-size: 48px; margin-bottom: 16px; }
    .title { color: #1a1a1a; font-size: 32px; font-weight: bold; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .content { background-color: #ffffff; border: 1px solid #e6ebf1; border-radius: 8px; padding: 40px; }
    .heading { color: #1a1a1a; font-size: 24px; font-weight: bold; margin: 0 0 20px; text-align: center; }
    .text { color: #525f7f; font-size: 16px; line-height: 1.6; margin: 0 0 16px; }
    .button-container { text-align: center; margin: 32px 0; }
    .button { background-color: #667eea; border-radius: 6px; color: #ffffff; display: inline-block; font-size: 16px; font-weight: bold; padding: 16px 32px; text-decoration: none; }
    .link-text { color: #667eea; font-size: 14px; word-break: break-all; margin: 0 0 16px; }
    .hr { border: none; border-top: 1px solid #e6ebf1; margin: 32px 0; }
    .footer { text-align: center; margin-top: 32px; }
    .footer-text { color: #8898aa; font-size: 14px; line-height: 1.5; margin: 0 0 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">📊</div>
      <h1 class="title">Crypto Snap Track</h1>
    </div>
    
    <div class="content">
      ${isSignup ? `
        <h2 class="heading">Welcome aboard! 🚀</h2>
        <p class="text">Thanks for joining Crypto Snap Track! We're excited to help you track your crypto portfolio with precision and style.</p>
        <p class="text">Click the button below to verify your email address and start tracking your investments:</p>
      ` : isRecovery ? `
        <h2 class="heading">Reset Your Password</h2>
        <p class="text">You requested to reset your password for your Crypto Snap Track account.</p>
        <p class="text">Click the button below to set a new password:</p>
      ` : `
        <h2 class="heading">Verify Your Email</h2>
        <p class="text">Please verify your email address to continue using Crypto Snap Track.</p>
      `}
      
      <div class="button-container">
        <a href="${verifyUrl}" class="button">
          ${isSignup ? 'Verify Account' : isRecovery ? 'Reset Password' : 'Verify Email'}
        </a>
      </div>
      
      <p class="text">Or copy and paste this link into your browser:</p>
      <p class="link-text">${verifyUrl}</p>
      
      <hr class="hr">
      
      <p class="footer-text">If you didn't request this email, you can safely ignore it.</p>
    </div>
    
    <div class="footer">
      <p class="footer-text"><strong>Crypto Snap Track</strong> - Your crypto portfolio, simplified.</p>
      <p class="footer-text">Track, analyze, and grow your crypto investments with confidence.</p>
    </div>
  </div>
</body>
</html>
  `
}