// Email sender module for Celloxen platform - Updated for health@celloxen.com
window.sendReportEmail = async function(pdfBlob, patientEmail, patientName) {
    try {
        // Check if user is logged in via database auth
        const authData = localStorage.getItem('celloxen_auth');
        if (!authData) {
            alert('Please log in to send emails');
            return false;
        }

        const auth = JSON.parse(authData);
        
        // Use the correct anon key from your supabase-config.js
        const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZmlmd3pnYXpxbHJpZ3d1bXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNTM0MjYsImV4cCI6MjA3MjgyOTQyNn0.wcUBq6Pszjtqn5aBtuu3iXBE4BLmu8x9LtJbsMWlIiA';

        // Convert PDF blob to base64
        const reader = new FileReader();
        const base64Promise = new Promise((resolve, reject) => {
            reader.onloadend = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
        });
        reader.readAsDataURL(pdfBlob);
        const pdfBase64 = await base64Promise;

        // Prepare email content with updated sender
        const emailData = {
            to: patientEmail,
            from: 'Celloxen Health <health@celloxen.com>', // Updated sender with display name
            replyTo: 'Celloxen Health <health@celloxen.com>', // Updated reply-to
            subject: `Health Assessment Report - ${patientName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); padding: 20px; text-align: center;">
                        <h2 style="color: white; margin: 0;">Celloxen Wellness Platform</h2>
                    </div>
                    <div style="padding: 20px;">
                        <p>Dear ${patientName},</p>
                        <p>Please find attached your comprehensive health assessment report from your recent visit.</p>
                        <p>This report includes:</p>
                        <ul>
                            <li>Health Assessment Results</li>
                            <li>Constitutional Analysis</li>
                            <li>Personalized Treatment Recommendations</li>
                        </ul>
                        <p>If you have any questions about your report, please don't hesitate to contact us at <a href="mailto:health@celloxen.com">health@celloxen.com</a>.</p>
                        <p>Best regards,<br>Your Healthcare Team</p>
                    </div>
                    <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
                    <div style="padding: 0 20px 20px; text-align: center;">
                        <p style="font-size: 12px; color: #6b7280;">
                            This email contains confidential medical information. 
                            Please do not share without authorization.
                        </p>
                        <p style="font-size: 12px; color: #6b7280;">
                            Sent from: health@celloxen.com<br>
                            © 2025 Celloxen Wellness Platform. All rights reserved.
                        </p>
                    </div>
                </div>
            `,
            attachments: [{
                filename: `${patientName.replace(/\s+/g, '_')}_Health_Report.pdf`,
                content: pdfBase64,
                type: 'application/pdf'
            }]
        };

        // Send email via Supabase Edge Function with correct anon key
        const response = await fetch('https://defifwzgazqlrigwumqn.supabase.co/functions/v1/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${anonKey}`,
                'apikey': anonKey
            },
            body: JSON.stringify(emailData)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            alert('Report sent successfully to ' + patientEmail);
            
            // Optional: Log email activity if supabase is available
            try {
                if (window.supabase) {
                    await window.supabase.from('email_logs').insert({
                        clinic_id: auth.clinicId,
                        patient_email: patientEmail,
                        email_type: 'report',
                        sent_by: auth.username,
                        sent_from: 'health@celloxen.com', // Updated sender in logs
                        sent_at: new Date().toISOString()
                    });
                }
            } catch (logError) {
                // Logging is optional, don't fail the email send
                console.log('Email activity logging skipped');
            }
            
            return true;
        } else {
            console.error('Email send error:', result);
            alert('Failed to send email: ' + (result.message || result.error || 'Unknown error'));
            return false;
        }
    } catch (error) {
        console.error('Error sending email:', error);
        alert('Error sending email: ' + error.message);
        return false;
    }
};

// Function to send appointment reminders
window.sendAppointmentReminder = async function(patientEmail, patientName, appointmentDate, appointmentTime) {
    try {
        const authData = localStorage.getItem('celloxen_auth');
        if (!authData) {
            alert('Please log in to send emails');
            return false;
        }

        const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZmlmd3pnYXpxbHJpZ3d1bXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNTM0MjYsImV4cCI6MjA3MjgyOTQyNn0.wcUBq6Pszjtqn5aBtuu3iXBE4BLmu8x9LtJbsMWlIiA';

        const emailData = {
            to: patientEmail,
            from: 'Celloxen Health <health@celloxen.com>', // Updated sender with display name
            replyTo: 'Celloxen Health <health@celloxen.com>', // Updated reply-to
            subject: `Appointment Reminder - ${appointmentDate}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); padding: 20px; text-align: center;">
                        <h2 style="color: white; margin: 0;">Appointment Reminder</h2>
                    </div>
                    <div style="padding: 20px;">
                        <p>Dear ${patientName},</p>
                        <p>This is a reminder of your upcoming appointment:</p>
                        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <p><strong>Date:</strong> ${appointmentDate}</p>
                            <p><strong>Time:</strong> ${appointmentTime}</p>
                            <p><strong>Location:</strong> Celloxen Wellness Clinic</p>
                        </div>
                        <p>Please arrive 10 minutes early to complete any necessary paperwork.</p>
                        <p>If you need to reschedule, please contact us at <a href="mailto:health@celloxen.com">health@celloxen.com</a> as soon as possible.</p>
                        <p>Best regards,<br>Your Healthcare Team</p>
                    </div>
                    <div style="padding: 0 20px 20px; text-align: center;">
                        <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
                        <p style="font-size: 12px; color: #6b7280;">
                            Sent from: health@celloxen.com<br>
                            © 2025 Celloxen Wellness Platform. All rights reserved.
                        </p>
                    </div>
                </div>
            `
        };

        const response = await fetch('https://defifwzgazqlrigwumqn.supabase.co/functions/v1/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${anonKey}`,
                'apikey': anonKey
            },
            body: JSON.stringify(emailData)
        });

        const result = await response.json();
        return response.ok && result.success;
    } catch (error) {
        console.error('Error sending reminder:', error);
        return false;
    }
};

// Function to test email configuration with health@celloxen.com
window.testEmailConfiguration = async function(testEmail = 'health@celloxen.com') {
    try {
        const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZmlmd3pnYXpxbHJpZ3d1bXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNTM0MjYsImV4cCI6MjA3MjgyOTQyNn0.wcUBq6Pszjtqn5aBtuu3iXBE4BLmu8x9LtJbsMWlIiA';
        
        const response = await fetch('https://defifwzgazqlrigwumqn.supabase.co/functions/v1/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${anonKey}`,
                'apikey': anonKey
            },
            body: JSON.stringify({
                to: testEmail,
                from: 'Celloxen Health <health@celloxen.com>', // Updated sender with display name
                replyTo: 'Celloxen Health <health@celloxen.com>', // Updated reply-to
                subject: 'Test Email - Celloxen Platform',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); padding: 20px; text-align: center;">
                            <h2 style="color: white; margin: 0;">Celloxen Email Test</h2>
                        </div>
                        <div style="padding: 20px;">
                            <p>This is a test email to verify your email configuration is working correctly.</p>
                            <p>If you received this email, your Celloxen platform email system is properly configured!</p>
                        </div>
                        <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
                        <div style="padding: 0 20px 20px; text-align: center;">
                            <p style="font-size: 12px; color: #6b7280;">
                                Email sent from: health@celloxen.com<br>
                                Timestamp: ${new Date().toISOString()}
                            </p>
                        </div>
                    </div>
                `
            })
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
            alert('Test email sent successfully to ' + testEmail + '!');
            return true;
        } else {
            alert('Test email failed: ' + (result.message || result.error || 'Unknown error'));
            return false;
        }
    } catch (error) {
        console.error('Test email error:', error);
        alert('Test email error: ' + error.message);
        return false;
    }
};

// Function to send welcome email to new patients
window.sendWelcomeEmail = async function(patientEmail, patientName) {
    try {
        const authData = localStorage.getItem('celloxen_auth');
        if (!authData) {
            alert('Please log in to send emails');
            return false;
        }

        const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZmlmd3pnYXpxbHJpZ3d1bXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNTM0MjYsImV4cCI6MjA3MjgyOTQyNn0.wcUBq6Pszjtqn5aBtuu3iXBE4BLmu8x9LtJbsMWlIiA';

        const emailData = {
            to: patientEmail,
            from: 'Celloxen Health <health@celloxen.com>',
            replyTo: 'Celloxen Health <health@celloxen.com>',
            subject: `Welcome to Celloxen Wellness Platform - ${patientName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); padding: 30px; text-align: center;">
                        <h2 style="color: white; margin: 0;">Welcome to Celloxen</h2>
                    </div>
                    <div style="padding: 30px;">
                        <p>Dear ${patientName},</p>
                        <p>Welcome to the Celloxen Wellness Platform! We're delighted to have you as our patient.</p>
                        <p>At Celloxen, we're committed to providing you with personalized, comprehensive healthcare using advanced IRIS analysis and holistic health assessments.</p>
                        
                        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #1e3a8a;">What to Expect:</h3>
                            <ul style="color: #374151;">
                                <li>Comprehensive health assessments</li>
                                <li>Advanced IRIS constitutional analysis</li>
                                <li>Personalized treatment plans</li>
                                <li>Regular progress monitoring</li>
                            </ul>
                        </div>
                        
                        <p>If you have any questions or need assistance, please don't hesitate to contact us at <a href="mailto:health@celloxen.com">health@celloxen.com</a>.</p>
                        
                        <p>We look forward to supporting you on your wellness journey!</p>
                        
                        <p>Warm regards,<br>The Celloxen Healthcare Team</p>
                    </div>
                    <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
                    <div style="padding: 0 20px 20px; text-align: center;">
                        <p style="font-size: 12px; color: #6b7280;">
                            Sent from: health@celloxen.com<br>
                            © 2025 Celloxen Wellness Platform. All rights reserved.<br>
                            This email contains confidential information.
                        </p>
                    </div>
                </div>
            `
        };

        const response = await fetch('https://defifwzgazqlrigwumqn.supabase.co/functions/v1/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${anonKey}`,
                'apikey': anonKey
            },
            body: JSON.stringify(emailData)
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
            console.log('Welcome email sent successfully');
            return true;
        } else {
            console.error('Welcome email failed:', result);
            return false;
        }
    } catch (error) {
        console.error('Error sending welcome email:', error);
        return false;
    }
};

console.log('Email sender module loaded successfully (Updated: health@celloxen.com)');
console.log('Test with: testEmailConfiguration("your-email@example.com")');
console.log('Default test email is now: health@celloxen.com');
