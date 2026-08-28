<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ERP System</title>
    <style>
        @media only screen and (max-width: 480px) {
            .em-header { padding: 22px 14px 34px !important; }
            .em-content { padding: 20px 16px 28px !important; }
            .em-title { font-size: 22px !important; }
            .em-btn { width: 100% !important; box-sizing: border-box !important; padding: 14px 12px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 40px 20px; background-color: {{ $themeColor }}0d; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #eef0f2; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);">

        <!-- Header -->
        <div class="em-header" style="background-color: {{ $themeColor }}; padding: 28px 20px 42px 20px; text-align: center; border-bottom-left-radius: 50% 18px; border-bottom-right-radius: 50% 18px;">
            <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">
                <span style="display: inline-block; width: 24px; height: 24px; border: 2px solid #ffffff; border-radius: 50%; font-size: 14px; line-height: 24px; vertical-align: middle;">&#10004;</span>
                <span style="vertical-align: middle;">&nbsp; Attendance System</span>
            </h2>
        </div>

        <!-- Content -->
        <div class="em-content" style="padding: 24px 40px 40px 40px; text-align: center;">

            <!-- Illustration: envelope with a confirmation badge -->
            <div style="width: 110px; height: 110px; background-color: #f1f6f4; border-radius: 50%; margin: 0 auto 20px auto;">
                <div style="width: 70px; margin: 0 auto; padding-top: 26px;">
                    <div style="text-align: center; margin-bottom: -8px;">
                        <span style="display: inline-block; width: 26px; height: 26px; background-color: {{ $themeColor }}; border: 3px solid #ffffff; border-radius: 50%; color: #ffffff; font-size: 13px; line-height: 24px; box-shadow: 0 2px 4px rgba(0,0,0,.12);">&#10004;</span>
                    </div>
                    <div style="height: 40px; background-color: {{ $themeColor }}; border-radius: 6px; overflow: hidden;">
                        <div style="width: 0; height: 0; margin: 0 auto; border-left: 35px solid transparent; border-right: 35px solid transparent; border-top: 24px solid rgba(255,255,255,.28);"></div>
                    </div>
                </div>
            </div>

            <h1 class="em-title" style="margin: 0 0 6px 0; font-size: 26px; color: #1f2937; font-weight: 800;">Welcome to ERP System!</h1>
            <p style="margin: 0 0 18px 0; font-size: 15px; font-weight: 700; color: {{ $themeColor }};">Your account has been successfully registered.</p>

            <!-- Divider -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 26px 0;"><tr>
                <td style="border-bottom: 1px solid #eef0f2;"></td>
                <td width="10" style="text-align: center;"><span style="display: inline-block; width: 6px; height: 6px; background-color: {{ $themeColor }}55; border-radius: 50%;"></span></td>
                <td style="border-bottom: 1px solid #eef0f2;"></td>
            </tr></table>
            
            <div style="text-align: left;">
                <p style="margin: 0 0 5px 0; font-size: 16px; font-weight: 700; color: #111827;">Hello {{ $user->first_name }},</p>
                <p style="margin: 0 0 20px 0; font-size: 14px; color: #4b5563; line-height: 1.5;">You are successfully registered on this email and your temporary password is:</p>
                
                <div style="background-color: {{ $themeColor }}08; border: 1px solid {{ $themeColor }}33; border-radius: 8px; margin-bottom: 25px; overflow: hidden;">
                    <!-- Email Row -->
                    <div style="padding: 15px; border-bottom: 1px solid {{ $themeColor }}22;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                                <td width="40" valign="middle">
                                    <div style="width: 36px; height: 36px; background-color: {{ $themeColor }}; border-radius: 50%; text-align: center; line-height: 36px;">
                                        <span style="color: #ffffff; font-size: 16px;">&#9993;</span>
                                    </div>
                                </td>
                                <td valign="middle">
                                    <div style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 3px;">Email Address</div>
                                    <div style="font-size: 15px; font-weight: 600; color: #111827; word-break: break-all;">{{ $user->email }}</div>
                                </td>
                                <td width="28" valign="middle" align="right"><span style="display: inline-block; width: 13px; height: 15px; border: 1.6px solid {{ $themeColor }}59; border-radius: 3px;">&nbsp;</span></td>
                            </tr>
                        </table>
                    </div>
                    <!-- Password Row -->
                    <div style="padding: 15px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                                <td width="40" valign="middle">
                                    <div style="width: 36px; height: 36px; background-color: {{ $themeColor }}; border-radius: 50%; text-align: center; line-height: 36px;">
                                        <span style="color: #ffffff; font-size: 16px;">&#128274;</span>
                                    </div>
                                </td>
                                <td valign="middle">
                                    <div style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 3px;">Temporary Password</div>
                                    <div style="font-size: 18px; font-family: monospace; font-weight: 700; letter-spacing: 1px; color: {{ $themeColor }}; word-break: break-all;">{{ $password }}</div>
                                </td>
                                <td width="28" valign="middle" align="right"><span style="display: inline-block; width: 13px; height: 15px; border: 1.6px solid {{ $themeColor }}59; border-radius: 3px;">&nbsp;</span></td>
                            </tr>
                        </table>
                    </div>
                </div>
            </div>
            
            <p style="margin: 0 0 25px 0; font-size: 13px; color: #4b5563;">
                <span style="color: {{ $themeColor }}; font-weight: bold;">&#9888;</span> Please change your password after logging in for security.
            </p>
            
            <a href="{{ config('app.url', 'http://localhost:5176') }}" class="em-btn" style="display: block; width: 80%; margin: 0 auto; padding: 15px 30px; background-color: {{ $themeColor }}; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; border-radius: 10px; box-shadow: 0 6px 14px {{ $themeColor }}40;">
                Login to Your Account &nbsp;&rarr;
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
