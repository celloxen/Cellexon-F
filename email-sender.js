// Email sender module for Celloxen platform - Simplified Version
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

        // Prepare email content
        const emailData = {
            to: patientEmail,
            subject: `Health Assessment Report - ${patientName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #1e3a8a;">Celloxen Wellness Platform</h2>
                    <p>Dear ${patientName},</p>
                    <p>Please find attached your comprehensive health assessment report from your recent visit.</p>
                    <p>This report includes:</p>
                    <ul>
                        <li>Health Assessment Results</li>
                        <li>Constitutional Analysis</li>
                        <li>Personalized Treatment Recommendations</li>
                    </ul>
                    <p>If you have any questions about your report, please don't hesitate to contact us.</p>
                    <p>Best regards,<br>Your Healthcare Team</p>
                    <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
                    <p style="font-size: 12px; color: #6b7280;">
                        This email contains confidential medical information. 
                        Please do not share without authorization.
                    </p>
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
            subject: `Appointment Reminder - ${appointmentDate}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #1e3a8a;">Appointment Reminder</h2>
                    <p>Dear ${patientName},</p>
                    <p>This is a reminder of your upcoming appointment:</p>
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Date:</strong> ${appointmentDate}</p>
                        <p><strong>Time:</strong> ${appointmentTime}</p>
                        <p><strong>Location:</strong> Celloxen Wellness Clinic</p>
                    </div>
                    <p>Please arrive 10 minutes early to complete any necessary paperwork.</p>
                    <p>If you need to reschedule, please contact us as soon as possible.</p>
                    <p>Best regards,<br>Your Healthcare Team</p>
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

// Function to test email configuration with your registered email
window.testEmailConfiguration = async function(testEmail = 'givespotuk@gmail.com') {
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
                subject: 'Test Email - Celloxen Platform',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #1e3a8a;">Celloxen Email Test</h2>
                        <p>This is a test email to verify your email configuration is working correctly.</p>
                        <p>If you received this email, your Celloxen platform email system is properly configured!</p>
                        <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
                        <p style="font-size: 12px; color: #6b7280;">
                            Email sent from: Celloxen Wellness Platform<br>
                            Timestamp: ${new Date().toISOString()}
                        </p>
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

console.log('Email sender module loaded successfully (Simplified Version)');
console.log('Test with: testEmailConfiguration("givespotuk@gmail.com")');
