// Lily Health Consultant - PDF Report Generator
class LilyPDFGenerator {
    constructor() {
        this.reportTemplate = null;
    }

    async generateReport(sessionData, assessmentResults, therapyRecommendations) {
        const reportDate = new Date().toLocaleDateString('en-GB');
        const reportTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        
        const reportHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                @page {
                    size: A4;
                    margin: 20mm;
                }
                
                body {
                    font-family: 'Segoe UI', Arial, sans-serif;
                    line-height: 1.6;
                    color: #1f2937;
                }
                
                .header {
                    border-bottom: 3px solid #1e3a8a;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                
                .logo {
                    font-size: 32px;
                    font-weight: bold;
                    color: #1e3a8a;
                    margin-bottom: 10px;
                }
                
                .clinic-info {
                    color: #6b7280;
                    font-size: 14px;
                    line-height: 1.4;
                }
                
                .report-title {
                    background: #1e3a8a;
                    color: white;
                    padding: 15px;
                    text-align: center;
                    margin: 30px 0;
                    border-radius: 8px;
                }
                
                .patient-info {
                    background: #f8fafc;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 30px;
                }
                
                .patient-info h2 {
                    color: #1e3a8a;
                    margin-bottom: 15px;
                    font-size: 20px;
                }
                
                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                }
                
                .info-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 5px 0;
                    border-bottom: 1px dotted #cbd5e1;
                }
                
                .info-label {
                    font-weight: 600;
                    color: #4b5563;
                }
                
                .info-value {
                    color: #1f2937;
                }
                
                .assessment-summary {
                    margin: 30px 0;
                }
                
                .assessment-summary h2 {
                    color: #1e3a8a;
                    border-bottom: 2px solid #e5e7eb;
                    padding-bottom: 10px;
                    margin-bottom: 20px;
                }
                
                .score-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 15px;
                    margin-bottom: 20px;
                }
                
                .score-item {
                    background: #f9fafb;
                    padding: 15px;
                    border-radius: 8px;
                    border-left: 4px solid #1e3a8a;
                }
                
                .score-category {
                    font-weight: 600;
                    color: #4b5563;
                    margin-bottom: 5px;
                }
                
                .score-value {
                    font-size: 24px;
                    font-weight: bold;
                    color: #1e3a8a;
                }
                
                .score-bar {
                    height: 8px;
                    background: #e5e7eb;
                    border-radius: 4px;
                    overflow: hidden;
                    margin-top: 8px;
                }
                
                .score-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #10b981, #059669);
                    border-radius: 4px;
                }
                
                .overall-score {
                    text-align: center;
                    padding: 20px;
                    background: linear-gradient(135deg, #f8fafc, #f1f5f9);
                    border-radius: 12px;
                    margin: 20px 0;
                }
                
                .overall-score-value {
                    font-size: 48px;
                    font-weight: bold;
                    color: #1e3a8a;
                    margin: 10px 0;
                }
                
                .recommendations {
                    margin: 30px 0;
                }
                
                .recommendations h2 {
                    color: #1e3a8a;
                    border-bottom: 2px solid #e5e7eb;
                    padding-bottom: 10px;
                    margin-bottom: 20px;
                }
                
                .therapy-card {
                    background: #f8fafc;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 15px;
                }
                
                .therapy-priority {
                    display: inline-block;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                    margin-bottom: 10px;
                }
                
                .priority-essential {
                    background: #fee2e2;
                    color: #991b1b;
                }
                
                .priority-recommended {
                    background: #fef3c7;
                    color: #92400e;
                }
                
                .priority-optional {
                    background: #dbeafe;
                    color: #1e40af;
                }
                
                .therapy-name {
                    font-size: 18px;
                    font-weight: 600;
                    color: #1f2937;
                    margin-bottom: 10px;
                }
                
                .therapy-details {
                    color: #6b7280;
                    margin-bottom: 10px;
                }
                
                .contraindications {
                    background: #fef2f2;
                    border: 2px solid #fecaca;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 30px 0;
                }
                
                .contraindications h2 {
                    color: #991b1b;
                    margin-bottom: 15px;
                }
                
                .warning-icon {
                    display: inline-block;
                    width: 24px;
                    height: 24px;
                    background: #dc2626;
                    color: white;
                    border-radius: 50%;
                    text-align: center;
                    line-height: 24px;
                    margin-right: 10px;
                }
                
                .footer {
                    margin-top: 50px;
                    padding-top: 20px;
                    border-top: 2px solid #e5e7eb;
                    text-align: center;
                    color: #6b7280;
                    font-size: 12px;
                }
                
                .signature-section {
                    margin-top: 40px;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 40px;
                }
                
                .signature-box {
                    border-top: 2px solid #1f2937;
                    padding-top: 10px;
                    text-align: center;
                    color: #6b7280;
                    font-size: 14px;
                }
                
                @media print {
                    .therapy-card {
                        page-break-inside: avoid;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">CELLOXEN</div>
                <div class="clinic-info">
                    ${sessionData.clinicName || 'Celloxen Health Clinic'}<br>
                    ${sessionData.clinicAddress || '123 Health Street, London, UK'}<br>
                    Tel: ${sessionData.clinicPhone || '+44 20 1234 5678'}<br>
                    Email: ${sessionData.clinicEmail || 'health@celloxen.com'}
                </div>
            </div>
            
            <h1 class="report-title">COMPREHENSIVE HEALTH ASSESSMENT REPORT</h1>
            
            <div class="patient-info">
                <h2>Patient Information</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">Patient Name:</span>
                        <span class="info-value">${sessionData.patientName}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Date of Birth:</span>
                        <span class="info-value">${this.calculateDOB(sessionData.patientAge)}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Age:</span>
                        <span class="info-value">${sessionData.patientAge} years</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Gender:</span>
                        <span class="info-value">${sessionData.patientGender}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Assessment Date:</span>
                        <span class="info-value">${reportDate}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Assessment Time:</span>
                        <span class="info-value">${reportTime}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Practitioner:</span>
                        <span class="info-value">${sessionData.practitionerName}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Session ID:</span>
                        <span class="info-value">${sessionData.sessionId}</span>
                    </div>
                </div>
            </div>
            
            <div class="assessment-summary">
                <h2>Assessment Results</h2>
                <div class="score-grid">
                    ${this.generateScoreItems(assessmentResults.categoryScores)}
                </div>
                <div class="overall-score">
                    <div>Overall Health Score</div>
                    <div class="overall-score-value">${assessmentResults.totalScore}%</div>
                    <div>${this.getScoreInterpretation(assessmentResults.totalScore)}</div>
                </div>
            </div>
            
            ${this.generateContraindicationsSection(assessmentResults.contraindications)}
            
            <div class="recommendations">
                <h2>Therapy Recommendations</h2>
                ${this.generateTherapyCards(therapyRecommendations)}
            </div>
            
            <div class="signature-section">
                <div class="signature-box">
                    Practitioner Signature<br>
                    ${sessionData.practitionerName}
                </div>
                <div class="signature-box">
                    Patient Signature<br>
                    ${sessionData.patientName}
                </div>
            </div>
            
            <div class="footer">
                <p>This report is confidential and intended solely for the named patient and healthcare provider.</p>
                <p>© ${new Date().getFullYear()} Celloxen Health Platform. All rights reserved.</p>
                <p>Report generated by Lily Health Consultant System v1.0</p>
            </div>
        </body>
        </html>`;
        
        return reportHTML;
    }

    calculateDOB(age) {
        const currentYear = new Date().getFullYear();
        const birthYear = currentYear - age;
        return `${birthYear} (estimated)`;
    }

    generateScoreItems(scores) {
        return Object.entries(scores).map(([category, score]) => `
            <div class="score-item">
                <div class="score-category">${this.formatCategoryName(category)}</div>
                <div class="score-value">${score}%</div>
                <div class="score-bar">
                    <div class="score-fill" style="width: ${score}%"></div>
                </div>
            </div>
        `).join('');
    }

    formatCategoryName(category) {
        const names = {
            physical: 'Physical Health',
            mental: 'Mental Health',
            lifestyle: 'Lifestyle Factors',
            environment: 'Environmental Health',
            history: 'Medical History'
        };
        return names[category] || category;
    }

    getScoreInterpretation(score) {
        if (score >= 80) return 'Excellent - Optimal health status';
        if (score >= 70) return 'Good - Minor areas for improvement';
        if (score >= 60) return 'Moderate - Several areas need attention';
        if (score >= 50) return 'Fair - Significant improvement needed';
        return 'Poor - Comprehensive intervention required';
    }

    generateContraindicationsSection(contraindications) {
        if (!contraindications || contraindications.length === 0) {
            return '';
        }
        
        return `
            <div class="contraindications">
                <h2><span class="warning-icon">⚠</span>Important Contraindications</h2>
                <ul>
                    ${contraindications.map(c => `
                        <li><strong>${c.condition}:</strong> ${c.reason}</li>
                    `).join('')}
                </ul>
                <p><strong>Note:</strong> Patient must obtain medical clearance before proceeding with recommended therapies.</p>
            </div>
        `;
    }

    generateTherapyCards(recommendations) {
        if (!recommendations || recommendations.length === 0) {
            return '<p>No specific therapy recommendations at this time.</p>';
        }
        
        return recommendations.map(therapy => `
            <div class="therapy-card">
                <span class="therapy-priority priority-${therapy.priority}">${therapy.priority.toUpperCase()}</span>
                <div class="therapy-name">${therapy.category}</div>
                <div class="therapy-details">
                    <strong>Protocol Codes:</strong> ${therapy.codes.join(', ')}<br>
                    <strong>Reason:</strong> ${therapy.reason}<br>
                    <strong>Frequency:</strong> ${therapy.frequency || '2-3 times per week'}<br>
                    <strong>Duration:</strong> ${therapy.duration || '6-8 weeks initial course'}
                </div>
            </div>
        `).join('');
    }

    async convertToPDF(htmlContent) {
        // This would integrate with a PDF service
        // For now, return the HTML which can be printed to PDF
        return htmlContent;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LilyPDFGenerator;
} else {
    window.LilyPDFGenerator = LilyPDFGenerator;
}
