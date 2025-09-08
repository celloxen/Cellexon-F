// SendGrid Email Configuration
// File Path: sendgrid-config.js

// SendGrid API Configuration
const SENDGRID_CONFIG = {
    apiKey: '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', 
    fromEmail: 'health@celloxen.com',
    fromName: 'Celloxen Medical Platform',
    templateIds: {
        clinicInvitation: 'd-your-template-id-here' // Replace with your SendGrid template ID
    }
};

// Send email using SendGrid API
async function sendEmail(toEmail, templateId, templateData) {
    try {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SENDGRID_CONFIG.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: {
                    email: SENDGRID_CONFIG.fromEmail,
                    name: SENDGRID_CONFIG.fromName
                },
                personalizations: [{
                    to: [{
                        email: toEmail
                    }],
                    dynamic_template_data: templateData
                }],
                template_id: templateId
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`SendGrid API error: ${response.status} - ${error}`);
        }

        console.log('Email sent successfully to:', toEmail);
        return { success: true, message: 'Email sent successfully' };

    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message };
    }
}

// Send clinic invitation email
async function sendClinicInvitationEmail(clinicData) {
    const templateData = {
        clinic_name: clinicData.business_name,
        trading_name: clinicData.clinic_trading_name,
        contact_name: clinicData.authorised_person,
        clinic_code: clinicData.clinic_code,
        device_serial: clinicData.device_serial_number,
        username: clinicData.username,
        password: clinicData.password,
        login_url: 'https://your-domain.com/unified-login.html',
        support_email: 'support@celloxen.com',
        portal_url: 'https://your-domain.com/patient-management.html'
    };

    return await sendEmail(
        clinicData.email,
        SENDGRID_CONFIG.templateIds.clinicInvitation,
        templateData
    );
}

// Password reset email
async function sendPasswordResetEmail(email, resetToken, clinicName) {
    const templateData = {
        clinic_name: clinicName,
        reset_url: `https://your-domain.com/reset-password.html?token=${resetToken}`,
        support_email: 'support@celloxen.com',
        expiry_hours: 24
    };

    // For now, we'll use a simple email format since we need a password reset template
    const emailBody = `
        <h2>Password Reset Request - Celloxen Medical Platform</h2>
        <p>Dear ${clinicName},</p>
        <p>You have requested to reset your password for the Celloxen Medical Platform.</p>
        <p><a href="${templateData.reset_url}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Reset Password</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not request this reset, please ignore this email.</p>
        <p>Best regards,<br>Celloxen Support Team</p>
    `;

    try {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SENDGRID_CONFIG.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: {
                    email: SENDGRID_CONFIG.fromEmail,
                    name: SENDGRID_CONFIG.fromName
                },
                personalizations: [{
                    to: [{
                        email: email
                    }],
                    subject: 'Password Reset - Celloxen Medical Platform'
                }],
                content: [{
                    type: 'text/html',
                    value: emailBody
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`SendGrid API error: ${response.status}`);
        }

        return { success: true, message: 'Password reset email sent' };

    } catch (error) {
        console.error('Error sending password reset email:', error);
        return { success: false, error: error.message };
    }
}

// Test email function
async function testEmailConnection() {
    const testData = {
        business_name: 'Test Clinic',
        clinic_trading_name: 'Test Wellness Centre',
        authorised_person: 'Dr. Test',
        clinic_code: 'TEST001',
        device_serial_number: 'DEV-2025-TEST',
        username: 'testclinic',
        password: 'TempPass123!',
        email: 'test@example.com'
    };

    console.log('Testing SendGrid connection...');
    const result = await sendClinicInvitationEmail(testData);
    
    if (result.success) {
        console.log('✅ SendGrid test successful');
    } else {
        console.error('❌ SendGrid test failed:', result.error);
    }
    
    return result;
}

// Export functions for use in other files
export {
    sendClinicInvitationEmail,
    sendPasswordResetEmail,
    testEmailConnection,
    SENDGRID_CONFIG
};
