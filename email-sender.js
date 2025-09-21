// email-sender.js
// Email Sending via Supabase Edge Function

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

        // Get current session token
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;

        if (!token) {
            alert('Please log in to send emails');
            return false;
        }

        // Prepare email data
        const emailData = {
            to: patient.email,
            subject: `Your ${formatReportType(reportType)} - Celloxen Clinic`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
                        <h1 style="margin: 0; font-size: 24px;">Celloxen Clinic</h1>
                        <p style="margin: 5px 0 0 0; opacity: 0.9;">Healthcare Excellence</p>
                    </div>
                    <div style="padding: 30px; background: #f8f9fa; border: 1px solid #e9ecef;">
                        <h2 style="color: #1e3a8a; margin-top: 0;">Dear ${patient.first_name} ${patient.last_name},</h2>
                        <p style="color: #495057; line-height: 1.6;">Your ${formatReportType(reportType).toLowerCase()} is ready and attached to this email.</p>
                        <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 0; color: #6c757d;"><strong>Report Generated:</strong> ${new Date().toLocaleDateString('en-GB')}</p>
                            <p style="margin: 5px 0 0 0; color: #6c757d;"><strong>Report Type:</strong> ${formatReportType(reportType)}</p>
                        </div>
                        <p style="color: #495057; line-height: 1.6;">If you have any questions about your report, please don't hesitate to contact us.</p>
                        <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;">
                        <p style="color: #495057; margin-bottom: 5px;">Best regards,</p>
                        <p style="color: #1e3a8a; font-weight: bold; margin: 5px 0;">Celloxen Clinic Team</p>
                        <p style="color: #6c757d; margin: 5px 0; font-size: 14px;">📞 +44 20 1234 5678</p>
                        <p style="color: #6c757d; margin: 5px 0; font-size: 14px;">📧 info@celloxen.com</p>
                    </div>
                    <div style="background: #e9ecef; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 10px 10px;">
                        <p style="margin: 0;">This email contains confidential medical information.</p>
                        <p style="margin: 5px 0 0 0;">Please do not share without authorization.</p>
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

        // Call Supabase Edge Function
        const response = await fetch('https://defifwzgazqlrigwumqn.supabase.co/functions/v1/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(emailData)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            // Log successful email to database
            try {
                await supabase.from('email_logs').insert({
                    patient_id: patient.id,
                    email_type: 'report',
                    recipient_email: patient.email,
                    status: 'sent',
                    subject: emailData.subject,
                    sent_at: new Date().toISOString(),
                    metadata: { 
                        report_type: reportType,
                        email_id: result.id 
                    }
                });
            } catch (logError) {
                console.error('Failed to log email:', logError);
                // Don't fail the whole operation if logging fails
            }

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

// Helper function to format report type
function formatReportType(type) {
    const types = {
        comprehensive: 'Comprehensive Diagnostic Report',
        progress: 'Treatment Progress Report',
        assessment: 'Health Assessment Report',
        summary: 'Treatment Summary Report'
    };
    return types[type] || 'Medical Report';
}

// Export for use in report generator
window.sendReportEmail = sendReportEmail;
