// email-sender.js
// Simple Email Sending for PDF Reports

async function sendReportEmail(patient, pdfBlob, reportType) {
    try {
        // Check if patient has email
        if (!patient.email) {
            alert('Patient does not have an email address on file');
            return false;
        }

        // Convert PDF blob to base64
        const reader = new FileReader();
        const base64Promise = new Promise((resolve) => {
            reader.onloadend = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
        });
        reader.readAsDataURL(pdfBlob);
        const pdfBase64 = await base64Promise;

        // Prepare email data
        const emailData = {
            to: patient.email,
            from: 'reports@celloxen.com', // You'll need to verify this domain in Resend
            subject: `Your ${reportType} Report - Celloxen Clinic`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
                        <h1 style="margin: 0;">Celloxen Clinic</h1>
                    </div>
                    <div style="padding: 30px; background: #f8f9fa;">
                        <h2>Dear ${patient.first_name} ${patient.last_name},</h2>
                        <p>Your ${reportType} report is ready and attached to this email.</p>
                        <p>Report generated on: ${new Date().toLocaleDateString('en-GB')}</p>
                        <br>
                        <p>If you have any questions about your report, please don't hesitate to contact us.</p>
                        <br>
                        <p>Best regards,<br>
                        Celloxen Clinic Team<br>
                        📞 +44 20 1234 5678<br>
                        📧 info@celloxen.com</p>
                    </div>
                    <div style="background: #e9ecef; padding: 15px; text-align: center; font-size: 12px; color: #6c757d;">
                        <p>This email contains confidential medical information. Please do not share without authorization.</p>
                    </div>
                </div>
            `,
            attachments: [
                {
                    filename: `${patient.first_name}_${patient.last_name}_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`,
                    content: pdfBase64
                }
            ]
        };

        // Call your email API endpoint
        const response = await fetch('https://defifwzgazqlrigwumqn.supabase.co/functions/v1/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            },
            body: JSON.stringify(emailData)
        });

        const result = await response.json();

        if (response.ok) {
            // Log successful email
            await supabase.from('email_logs').insert({
                patient_id: patient.id,
                email_type: 'report',
                recipient_email: patient.email,
                status: 'sent',
                subject: emailData.subject,
                sent_at: new Date().toISOString(),
                metadata: { report_type: reportType }
            });

            return true;
        } else {
            throw new Error(result.error || 'Failed to send email');
        }

    } catch (error) {
        console.error('Error sending email:', error);
        alert(`Failed to send email: ${error.message}`);
        return false;
    }
}

// Export for use in report generator
window.sendReportEmail = sendReportEmail;
