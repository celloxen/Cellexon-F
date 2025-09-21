// pdf-generator.js
// PDF Generation Module for Medical Reports using jsPDF

class PDFGenerator {
    constructor() {
        this.pageWidth = 210; // A4 width in mm
        this.pageHeight = 297; // A4 height in mm
        this.margins = {
            top: 20,
            right: 20,
            bottom: 20,
            left: 20
        };
        this.currentY = this.margins.top;
        this.lineHeight = 7;
        this.primaryColor = [30, 58, 138]; // RGB for #1e3a8a
        this.secondaryColor = [59, 130, 246]; // RGB for #3b82f6
    }

    // Generate Comprehensive Diagnostic Report
    async generateComprehensiveReport(reportData, patientData) {
        // Create new jsPDF instance
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Add header
        this.addReportHeader(pdf, 'Comprehensive Diagnostic Report', patientData);
        
        // Add patient information section
        this.addPatientInfoSection(pdf, patientData);
        
        // Add assessment scores if available
        if (reportData.health_assessment) {
            this.addHealthAssessmentSection(pdf, reportData.health_assessment);
        }
        
        // Add IRIS assessment if available
        if (reportData.iris_assessment) {
            this.addIrisAssessmentSection(pdf, reportData.iris_assessment);
        }
        
        // Add recommendations
        if (reportData.recommendations) {
            this.addRecommendationsSection(pdf, reportData.recommendations);
        }
        
        // Add therapy recommendations
        if (reportData.therapy_recommendations) {
            this.addTherapyRecommendationsSection(pdf, reportData.therapy_recommendations);
        }
        
        // Add footer to all pages
        this.addFooterToAllPages(pdf);
        
        return pdf;
    }

    // Add report header with logo and title
    addReportHeader(pdf, title, patientData) {
        // Add blue header background
        pdf.setFillColor(...this.primaryColor);
        pdf.rect(0, 0, this.pageWidth, 40, 'F');
        
        // Add clinic name
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(24);
        pdf.setFont('helvetica', 'bold');
        pdf.text('CELLOXEN CLINIC', this.margins.left, 15);
        
        // Add report title
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'normal');
        pdf.text(title, this.margins.left, 25);
        
        // Add date
        pdf.setFontSize(10);
        const today = new Date().toLocaleDateString('en-GB');
        pdf.text(`Report Date: ${today}`, this.pageWidth - this.margins.right - 40, 25);
        
        // Reset text color
        pdf.setTextColor(0, 0, 0);
        this.currentY = 50;
    }

    // Add patient information section
    addPatientInfoSection(pdf, patientData) {
        this.addSectionTitle(pdf, 'Patient Information');
        
        const patientInfo = [
            ['Patient Name:', `${patientData.first_name} ${patientData.last_name}`],
            ['Patient ID:', patientData.patient_id || 'N/A'],
            ['Date of Birth:', patientData.date_of_birth ? new Date(patientData.date_of_birth).toLocaleDateString('en-GB') : 'N/A'],
            ['Gender:', patientData.gender || 'N/A'],
            ['Contact:', patientData.phone || 'N/A'],
            ['Email:', patientData.email || 'N/A']
        ];
        
        this.addInfoTable(pdf, patientInfo);
        this.currentY += 10;
    }

    // Add health assessment section
    addHealthAssessmentSection(pdf, assessmentData) {
        this.addSectionTitle(pdf, 'Health Assessment Results');
        
        if (assessmentData.scores && assessmentData.scores.categories) {
            // Overall wellness score
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            const overallScore = assessmentData.scores.overall_wellness || 0;
            pdf.text(`Overall Wellness Score: ${overallScore}%`, this.margins.left, this.currentY);
            this.currentY += 10;
            
            // Category scores
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.text('Domain Scores:', this.margins.left, this.currentY);
            this.currentY += 5;
            
            const categories = assessmentData.scores.categories;
            Object.keys(categories).forEach(domain => {
                const score = 100 - categories[domain]; // Convert to wellness percentage
                this.addProgressBar(pdf, this.formatDomain(domain), score);
            });
        }
        
        // Add health insights if available
        if (assessmentData.insights && assessmentData.insights.length > 0) {
            this.currentY += 5;
            pdf.setFont('helvetica', 'bold');
            pdf.text('Key Health Insights:', this.margins.left, this.currentY);
            this.currentY += 5;
            
            pdf.setFont('helvetica', 'normal');
            assessmentData.insights.forEach(insight => {
                this.addBulletPoint(pdf, insight);
            });
        }
        
        this.currentY += 10;
    }

    // Add IRIS assessment section
    addIrisAssessmentSection(pdf, irisData) {
        this.checkPageBreak(pdf);
        this.addSectionTitle(pdf, 'IRIS Assessment Findings');
        
        if (irisData.constitutional_analysis) {
            const analysis = irisData.constitutional_analysis;
            
            // Constitutional type
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Constitutional Type:', this.margins.left, this.currentY);
            pdf.setFont('helvetica', 'normal');
            pdf.text(analysis.constitutional_type || 'Not determined', this.margins.left + 40, this.currentY);
            this.currentY += 7;
            
            // Patterns detected
            if (analysis.patterns && analysis.patterns.length > 0) {
                pdf.setFont('helvetica', 'bold');
                pdf.text('Iris Patterns Detected:', this.margins.left, this.currentY);
                this.currentY += 5;
                
                pdf.setFont('helvetica', 'normal');
                analysis.patterns.forEach(pattern => {
                    const text = `• ${pattern.area}: ${pattern.indication} (${pattern.severity})`;
                    this.addWrappedText(pdf, text, this.margins.left + 5, this.currentY);
                });
            }
            
            // Predispositions
            if (analysis.predispositions && analysis.predispositions.length > 0) {
                this.currentY += 5;
                pdf.setFont('helvetica', 'bold');
                pdf.text('Health Predispositions:', this.margins.left, this.currentY);
                this.currentY += 5;
                
                pdf.setFont('helvetica', 'normal');
                analysis.predispositions.forEach(pred => {
                    this.addBulletPoint(pdf, pred);
                });
            }
        }
        
        this.currentY += 10;
    }

    // Add recommendations section
    addRecommendationsSection(pdf, recommendations) {
        this.checkPageBreak(pdf);
        this.addSectionTitle(pdf, 'Clinical Recommendations');
        
        pdf.setFontSize(10);
        recommendations.forEach((recommendation, index) => {
            pdf.setFont('helvetica', 'bold');
            pdf.text(`${index + 1}.`, this.margins.left, this.currentY);
            pdf.setFont('helvetica', 'normal');
            this.addWrappedText(pdf, recommendation, this.margins.left + 10, this.currentY);
            this.currentY += 2;
        });
        
        this.currentY += 10;
    }

    // Add therapy recommendations section
    addTherapyRecommendationsSection(pdf, therapies) {
        this.checkPageBreak(pdf);
        this.addSectionTitle(pdf, 'Recommended Therapies');
        
        // Create therapy table
        const headers = ['Therapy Name', 'Code', 'Priority', 'Duration'];
        const data = therapies.map(therapy => [
            therapy.name,
            therapy.code,
            therapy.priority || 'Standard',
            therapy.duration || '45 min'
        ]);
        
        this.addTable(pdf, headers, data);
        this.currentY += 10;
    }

    // Generate Treatment Progress Report
    async generateProgressReport(patientData, sessionsData, metricsData) {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Add header
        this.addReportHeader(pdf, 'Treatment Progress Report', patientData);
        
        // Add patient info
        this.addPatientInfoSection(pdf, patientData);
        
        // Add treatment summary
        this.addTreatmentSummary(pdf, sessionsData);
        
        // Add wellness metrics
        if (metricsData && metricsData.length > 0) {
            this.addWellnessMetrics(pdf, metricsData);
        }
        
        // Add session history
        if (sessionsData && sessionsData.length > 0) {
            this.addSessionHistory(pdf, sessionsData);
        }
        
        // Add footer
        this.addFooterToAllPages(pdf);
        
        return pdf;
    }

    // Add treatment summary
    addTreatmentSummary(pdf, sessionsData) {
        this.addSectionTitle(pdf, 'Treatment Summary');
        
        const totalSessions = sessionsData.length;
        const completedSessions = sessionsData.filter(s => s.completed).length;
        const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
        
        const summaryInfo = [
            ['Total Sessions Scheduled:', totalSessions.toString()],
            ['Sessions Completed:', completedSessions.toString()],
            ['Completion Rate:', `${completionRate}%`],
            ['Treatment Duration:', '8 weeks'],
            ['Current Week:', Math.ceil(completedSessions / 2).toString()]
        ];
        
        this.addInfoTable(pdf, summaryInfo);
        this.currentY += 10;
    }

    // Add wellness metrics
    addWellnessMetrics(pdf, metricsData) {
        this.checkPageBreak(pdf);
        this.addSectionTitle(pdf, 'Wellness Metrics Progress');
        
        // Get latest metrics
        const latestMetrics = metricsData[metricsData.length - 1];
        
        if (latestMetrics) {
            pdf.setFontSize(10);
            
            // Sleep Quality
            this.addProgressBar(pdf, 'Sleep Quality', latestMetrics.sleep_quality * 10);
            
            // Stress Level (inverse for display)
            this.addProgressBar(pdf, 'Stress Management', (10 - latestMetrics.stress_level) * 10);
            
            // Energy Level
            this.addProgressBar(pdf, 'Energy Level', latestMetrics.energy_level * 10);
            
            // Overall Wellbeing
            this.addProgressBar(pdf, 'Overall Wellbeing', latestMetrics.overall_wellbeing * 10);
        }
        
        this.currentY += 10;
    }

    // Add session history
    addSessionHistory(pdf, sessionsData) {
        this.checkPageBreak(pdf);
        this.addSectionTitle(pdf, 'Recent Session History');
        
        // Take last 10 sessions
        const recentSessions = sessionsData.slice(-10);
        
        const headers = ['Date', 'Therapy', 'Status', 'Response'];
        const data = recentSessions.map(session => [
            new Date(session.session_date).toLocaleDateString('en-GB'),
            session.therapy_type || 'N/A',
            session.completed ? 'Completed' : 'Scheduled',
            session.post_response || 'N/A'
        ]);
        
        this.addTable(pdf, headers, data);
    }

    // Helper Methods
    
    addSectionTitle(pdf, title) {
        this.checkPageBreak(pdf);
        pdf.setFillColor(...this.secondaryColor);
        pdf.rect(this.margins.left, this.currentY - 5, this.pageWidth - this.margins.left - this.margins.right, 8, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(title, this.margins.left + 2, this.currentY);
        
        pdf.setTextColor(0, 0, 0);
        this.currentY += 10;
    }

    addInfoTable(pdf, data) {
        pdf.setFontSize(10);
        data.forEach(([label, value]) => {
            pdf.setFont('helvetica', 'bold');
            pdf.text(label, this.margins.left, this.currentY);
            pdf.setFont('helvetica', 'normal');
            pdf.text(value, this.margins.left + 50, this.currentY);
            this.currentY += 6;
        });
    }

    addProgressBar(pdf, label, percentage) {
        pdf.setFontSize(9);
        pdf.text(label, this.margins.left, this.currentY);
        
        // Draw background bar
        pdf.setFillColor(229, 231, 235); // Light gray
        pdf.rect(this.margins.left + 50, this.currentY - 3, 80, 4, 'F');
        
        // Draw progress bar
        const color = percentage >= 70 ? [16, 185, 129] : percentage >= 40 ? [251, 191, 36] : [239, 68, 68];
        pdf.setFillColor(...color);
        pdf.rect(this.margins.left + 50, this.currentY - 3, (80 * percentage) / 100, 4, 'F');
        
        // Add percentage text
        pdf.text(`${percentage}%`, this.margins.left + 135, this.currentY);
        
        this.currentY += 7;
    }

    addBulletPoint(pdf, text) {
        pdf.text('•', this.margins.left + 5, this.currentY);
        this.addWrappedText(pdf, text, this.margins.left + 10, this.currentY);
    }

    addWrappedText(pdf, text, x, startY) {
        const maxWidth = this.pageWidth - this.margins.left - this.margins.right - (x - this.margins.left);
        const lines = pdf.splitTextToSize(text, maxWidth);
        
        lines.forEach(line => {
            this.checkPageBreak(pdf);
            pdf.text(line, x, this.currentY);
            this.currentY += 5;
        });
    }

    addTable(pdf, headers, data) {
        this.checkPageBreak(pdf);
        
        const colWidth = (this.pageWidth - this.margins.left - this.margins.right) / headers.length;
        let startX = this.margins.left;
        
        // Headers
        pdf.setFillColor(...this.secondaryColor);
        pdf.rect(this.margins.left, this.currentY - 5, this.pageWidth - this.margins.left - this.margins.right, 7, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        headers.forEach((header, index) => {
            pdf.text(header, startX + (index * colWidth) + 2, this.currentY);
        });
        
        pdf.setTextColor(0, 0, 0);
        this.currentY += 8;
        
        // Data rows
        pdf.setFont('helvetica', 'normal');
        data.forEach((row, rowIndex) => {
            this.checkPageBreak(pdf);
            
            // Alternate row background
            if (rowIndex % 2 === 1) {
                pdf.setFillColor(248, 250, 252);
                pdf.rect(this.margins.left, this.currentY - 4, this.pageWidth - this.margins.left - this.margins.right, 6, 'F');
            }
            
            row.forEach((cell, cellIndex) => {
                const text = cell.toString().substring(0, 20); // Truncate long text
                pdf.text(text, startX + (cellIndex * colWidth) + 2, this.currentY);
            });
            this.currentY += 6;
        });
        
        this.currentY += 5;
    }

    checkPageBreak(pdf, requiredSpace = 30) {
        if (this.currentY + requiredSpace > this.pageHeight - this.margins.bottom) {
            pdf.addPage();
            this.currentY = this.margins.top;
            return true;
        }
        return false;
    }

    addFooterToAllPages(pdf) {
        const pageCount = pdf.internal.getNumberOfPages();
        
        for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i);
            
            // Add footer line
            pdf.setDrawColor(229, 231, 235);
            pdf.line(this.margins.left, this.pageHeight - 15, this.pageWidth - this.margins.right, this.pageHeight - 15);
            
            // Add page number
            pdf.setFontSize(8);
            pdf.setTextColor(107, 114, 128);
            pdf.text(
                `Page ${i} of ${pageCount}`,
                this.pageWidth / 2,
                this.pageHeight - 10,
                { align: 'center' }
            );
            
            // Add generation timestamp
            const timestamp = new Date().toLocaleString('en-GB');
            pdf.text(
                `Generated: ${timestamp}`,
                this.margins.left,
                this.pageHeight - 10
            );
            
            // Add clinic name
            pdf.text(
                'Celloxen Clinic',
                this.pageWidth - this.margins.right,
                this.pageHeight - 10,
                { align: 'right' }
            );
        }
    }

    formatDomain(domain) {
        const formats = {
            sleep: 'Sleep Quality',
            stress: 'Stress Management',
            cardiovascular: 'Cardiovascular Health',
            joint: 'Joint Health',
            digestive: 'Digestive Wellness',
            kidney: 'Kidney Function',
            energy: 'Energy Levels',
            metabolic: 'Metabolic Health'
        };
        return formats[domain] || domain;
    }

    // Save PDF with appropriate filename
    savePDF(pdf, patientName, reportType) {
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `${patientName.replace(/\s+/g, '_')}_${reportType}_${timestamp}.pdf`;
        pdf.save(filename);
    }

    // Get PDF as blob for email attachment
    getPDFBlob(pdf) {
        return pdf.output('blob');
    }

    // Get PDF as base64 for storage
    getPDFBase64(pdf) {
        return pdf.output('datauristring');
    }
}

// Export singleton instance
export const pdfGenerator = new PDFGenerator();
