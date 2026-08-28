<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ERP System</title>
</head>
<body style="margin: 0; padding: 40px 20px; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
        
        <!-- Header -->
        <div style="background-color: {{ $themeColor }}; padding: 30px 20px 40px 20px; text-align: center; border-bottom-left-radius: 50% 15px; border-bottom-right-radius: 50% 15px;">
            <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">&#10004; Attendance System</h2>
        </div>
        
        <!-- Content -->
        <div style="padding: 0 40px 40px 40px; text-align: center; margin-top: -30px;">
            
            <!-- Illustration -->
            <div style="width: 70px; height: 70px; background-color: #ffffff; border-radius: 50%; margin: 0 auto 20px auto; display: inline-block; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border: 2px solid {{ $themeColor }}15; text-align: center; line-height: 70px;">
                <span style="font-size: 32px; color: {{ $themeColor }};">&#9993;</span>
            </div>
            
            <h1 style="margin: 0 0 5px 0; font-size: 24px; color: #1f2937; font-weight: 800;">Welcome to ERP System!</h1>
            <p style="margin: 0 0 30px 0; font-size: 15px; font-weight: 600; color: {{ $themeColor }};">Your account has been successfully registered.</p>
            
            <div style="text-align: left;">
                <p style="margin: 0 0 5px 0; font-size: 16px; font-weight: 700; color: #111827;">Hello {{ $user->first_name }},</p>
                <p style="margin: 0 0 20px 0; font-size: 14px; color: #4b5563; line-height: 1.5;">You are successfully registered on this email and your temporary password is:</p>
                
                <div style="background-color: {{ $themeColor }}08; border: 1px solid {{ $themeColor }}33; border-radius: 8px; margin-bottom: 25px; overflow: hidden;">
                    <!-- Email Row -->
                    <div style="padding: 15px; border-bottom: 1px solid {{ $themeColor }}22;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                                <td width="40" valign="middle">
                                    <div style="width: 32px; height: 32px; background-color: {{ $themeColor }}15; border-radius: 50%; text-align: center; line-height: 32px;">
                                        <span style="color: {{ $themeColor }}; font-size: 16px;">&#9993;</span>
                                    </div>
                                </td>
                                <td valign="middle">
                                    <div style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 3px;">Email Address</div>
                                    <div style="font-size: 15px; font-weight: 600; color: #111827;">{{ $user->email }}</div>
                                </td>
                            </tr>
                        </table>
                    </div>
                    <!-- Password Row -->
                    <div style="padding: 15px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                                <td width="40" valign="middle">
                                    <div style="width: 32px; height: 32px; background-color: {{ $themeColor }}15; border-radius: 50%; text-align: center; line-height: 32px;">
                                        <span style="color: {{ $themeColor }}; font-size: 16px;">&#128274;</span>
                                    </div>
                                </td>
                                <td valign="middle">
                                    <div style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 3px;">Temporary Password</div>
                                    <div style="font-size: 18px; font-family: monospace; font-weight: 700; letter-spacing: 1px; color: {{ $themeColor }};">{{ $password }}</div>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
            </div>
            
            <p style="margin: 0 0 25px 0; font-size: 13px; color: #4b5563;">
                <span style="color: {{ $themeColor }}; font-weight: bold;">&#9888;</span> Please change your password after logging in for security.
            </p>
            
            <a href="{{ config('app.url', 'http://localhost:5176') }}" style="display: inline-block; padding: 14px 30px; background-color: {{ $themeColor }}; color: #ffffff; text-decoration: none; font-weight: 600; border-radius: 6px; box-shadow: 0 4px 6px {{ $themeColor }}44;">
                Login to Your Account &rarr;
            </a>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 25px 20px; text-align: center; border-top: 1px solid #f3f4f6;">
            <p style="margin: 0 0 5px 0; font-size: 12px; color: #6b7280;">Need help? Contact our support team.</p>
            <p style="margin: 0 0 5px 0; font-size: 12px; color: #6b7280;">&hearts; Thank you for choosing our system.</p>
            <p style="margin: 0; font-size: 11px; color: #9ca3af;">&copy; {{ date('Y') }} ERP System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
