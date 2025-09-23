// IRIS Assessment Save Fix
// Add this code to your iris-assessment.html file or replace the existing completeAssessment function

window.completeAssessment = async function() {
    const assessmentData = collectAssessmentData();
    
    // Validate required fields
    if (!assessmentData.findings.constitution_type || !assessmentData.findings.fiber_density) {
        alert('Please complete all required fields');
        return;
    }
    
    try {
        // First, try to save with the full structure
        let saveData = {
            patient_id: currentPatient.id,
            clinic_id: currentPatient.clinic_id,
            
            // Try both formats - the table might accept either
            assessment_data: assessmentData,
            
            // Also save individual fields for compatibility
            constitution_type: assessmentData.findings.constitution_type,
            fiber_density: assessmentData.findings.fiber_density,
            pupil_size: assessmentData.findings.pupil_size,
            collarette_position: assessmentData.findings.collarette_position,
            lacunae: assessmentData.findings.lacunae,
            stress_rings: assessmentData.findings.stress_rings,
            clinical_notes: assessmentData.findings.clinical_notes,
            
            // Image data
            images: {
                left: irisImages.left ? {
                    url: irisImages.left.publicUrl || irisImages.left.url,
                    path: irisImages.left.storagePath,
                    uploaded: irisImages.left.uploaded
                } : null,
                right: irisImages.right ? {
                    url: irisImages.right.publicUrl || irisImages.right.url,
                    path: irisImages.right.storagePath,
                    uploaded: irisImages.right.uploaded
                } : null
            },
            
            // Status fields
            status: 'completed',
            completed_at: new Date().toISOString(),
            created_at: new Date().toISOString()
        };
        
        // If images were uploaded, also save direct URLs
        if (irisImages.left && irisImages.left.publicUrl) {
            saveData.left_iris_url = irisImages.left.publicUrl;
            saveData.left_iris_path = irisImages.left.storagePath;
        }
        if (irisImages.right && irisImages.right.publicUrl) {
            saveData.right_iris_url = irisImages.right.publicUrl;
            saveData.right_iris_path = irisImages.right.storagePath;
        }
        
        console.log('Attempting to save assessment data:', saveData);
        
        // Try to insert the data
        const { data, error } = await supabase
            .from('iris_assessments')
            .insert([saveData])
            .select()
            .single();
        
        if (error) {
            console.error('Supabase error:', error);
            
            // If the first attempt fails, try a simpler structure
            if (error.message && error.message.includes('assessment_data')) {
                console.log('Trying alternative save format without assessment_data column...');
                
                // Remove the assessment_data field and try again
                delete saveData.assessment_data;
                
                const { data: altData, error: altError } = await supabase
                    .from('iris_assessments')
                    .insert([saveData])
                    .select()
                    .single();
                
                if (altError) {
                    throw altError;
                }
                
                // Use alternative data if successful
                handleSuccessfulSave(altData);
                return;
            } else {
                throw error;
            }
        }
        
        // Handle successful save
        handleSuccessfulSave(data);
        
    } catch (error) {
        console.error('Error completing assessment:', error);
        
        // Provide more specific error messages
        if (error.code === 'PGRST204') {
            alert('Database schema error. Please contact administrator to update the iris_assessments table.');
        } else if (error.code === '23503') {
            alert('Invalid patient or clinic reference. Please verify patient data.');
        } else {
            alert('Error saving assessment: ' + (error.message || 'Unknown error'));
        }
    }
};

function handleSuccessfulSave(data) {
    console.log('Assessment saved successfully:', data);
    
    // Update session storage
    sessionStorage.setItem('irisAssessmentId', data.id);
    sessionStorage.setItem('irisAssessmentCompleted', 'true');
    
    // Store the assessment data for report generation
    sessionStorage.setItem('irisAssessmentData', JSON.stringify(data));
    
    // Show success modal
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.add('active');
        modal.classList.add('show');
        modal.style.display = 'flex';
    } else {
        // Fallback alert if modal doesn't exist
        if (confirm('Assessment saved successfully! Would you like to generate the comprehensive report now?')) {
            window.location.href = `report-generator.html?patientId=${currentPatient.id}`;
        }
    }
}

// Alternative: Minimal save function if table structure is unknown
window.saveAssessmentMinimal = async function() {
    try {
        // Get table structure first
        const { data: columns, error: schemaError } = await supabase
            .from('iris_assessments')
            .select('*')
            .limit(0);
        
        console.log('Table structure check:', columns, schemaError);
        
        // Build save data based on what we know exists
        const minimalData = {
            patient_id: currentPatient.id,
            clinic_id: currentPatient.clinic_id,
            created_at: new Date().toISOString()
        };
        
        // Add fields that we know exist
        const findings = collectAssessmentData().findings;
        
        // Try to add each field individually
        const possibleFields = [
            'constitution_type',
            'fiber_density', 
            'pupil_size',
            'collarette_position',
            'lacunae',
            'stress_rings',
            'clinical_notes',
            'status',
            'completed_at',
            'left_iris_url',
            'right_iris_url'
        ];
        
        possibleFields.forEach(field => {
            if (findings[field]) {
                minimalData[field] = findings[field];
            }
        });
        
        // Add status
        minimalData.status = 'completed';
        minimalData.completed_at = new Date().toISOString();
        
        // Try to save
        const { data, error } = await supabase
            .from('iris_assessments')
            .insert([minimalData])
            .select()
            .single();
        
        if (error) throw error;
        
        handleSuccessfulSave(data);
        
    } catch (error) {
        console.error('Minimal save failed:', error);
        alert('Unable to save assessment. Please check database configuration.');
    }
};

// Export for debugging
window.debugAssessmentTable = async function() {
    try {
        // Get table columns
        const { data, error } = await supabase
            .rpc('get_table_columns', { table_name: 'iris_assessments' })
            .single();
        
        console.log('Table columns:', data);
        
        if (error) {
            // Alternative method
            const { data: sample, error: sampleError } = await supabase
                .from('iris_assessments')
                .select('*')
                .limit(1);
            
            console.log('Sample data:', sample);
            console.log('Sample error:', sampleError);
        }
    } catch (err) {
        console.log('Debug error:', err);
    }
};
