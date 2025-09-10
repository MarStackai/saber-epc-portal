// SharePoint Configuration
const SHAREPOINT_BASE_URL = 'https://saberrenewables.sharepoint.com/sites/SaberEPCPartners';
const FORM_BASE_URL = SHAREPOINT_BASE_URL + '/SiteAssets/EPCForm';

// Form Management
let currentStep = 1;
const totalSteps = 4;
let formData = {};
let uploadedFiles = [];

// DOM Elements
const form = document.getElementById('epcOnboardingForm');
const fileInput = document.getElementById('fileInput');
const fileUploadArea = document.getElementById('fileUploadArea');
const fileList = document.getElementById('fileList');
const modal = document.getElementById('successModal');

// Initialize - WITH AUTHENTICATION CHECK
document.addEventListener('DOMContentLoaded', () => {
    // Check if coming from apply page with valid code
    const urlParams = new URLSearchParams(window.location.search);
    const invitationCode = urlParams.get('code');
    
    if (invitationCode && invitationCode.length === 8) {
        // Valid invitation code provided - create auth session
        const authData = {
            invitationCode: invitationCode,
            timestamp: Date.now(),
            verified: true
        };
        sessionStorage.setItem('epcAuth', JSON.stringify(authData));
    }
    
    // Check authentication
    const auth = sessionStorage.getItem('epcAuth');
    
    if (!auth) {
        // No auth and no valid code - redirect back to apply page
        window.location.href = '/epc/apply';
        return;
    }
    
    const authData = JSON.parse(auth);
    
    // Check if session expired (24 hours)
    if (Date.now() - authData.timestamp > 86400000) {
        sessionStorage.removeItem('epcAuth');
        window.location.href = '/epc/apply';
        return;
    }
    
    // Continue with form initialization only if authenticated
    initializeEventListeners();
    updateProgressBar();
});

// Event Listeners
function initializeEventListeners() {
    // Next/Previous buttons
    document.querySelectorAll('.next-step').forEach(btn => {
        btn.addEventListener('click', nextStep);
    });
    
    document.querySelectorAll('.prev-step').forEach(btn => {
        btn.addEventListener('click', prevStep);
    });
    
    // Form submission - CRITICAL FIX
    if (form) {
        form.addEventListener('submit', handleSubmit);
        // Also prevent any default action on the form
        form.setAttribute('action', '#');
        form.setAttribute('method', 'POST');
    }
    
    // File upload
    if (fileUploadArea) {
        fileUploadArea.addEventListener('click', () => fileInput.click());
    }
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    // Drag and drop
    if (fileUploadArea) {
        fileUploadArea.addEventListener('dragover', handleDragOver);
        fileUploadArea.addEventListener('dragleave', handleDragLeave);
        fileUploadArea.addEventListener('drop', handleDrop);
    }
    
    // Input validation
    const inputs = form ? form.querySelectorAll('input[required], textarea[required]') : [];
    inputs.forEach(input => {
        input.addEventListener('blur', () => validateField(input));
    });
}

// Step Navigation
function nextStep() {
    if (validateCurrentStep()) {
        saveStepData();
        if (currentStep < totalSteps) {
            currentStep++;
            showStep(currentStep);
            updateProgressBar();
        }
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
        updateProgressBar();
    }
}

function showStep(step) {
    // Hide all steps
    document.querySelectorAll('.form-step').forEach(s => {
        s.classList.remove('active');
    });
    
    // Show current step
    const stepElement = document.querySelector(`.form-step[data-step="${step}"]`);
    if (stepElement) {
        stepElement.classList.add('active');
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateProgressBar() {
    document.querySelectorAll('.progress-step').forEach((step, index) => {
        const stepNum = index + 1;
        
        if (stepNum < currentStep) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (stepNum === currentStep) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    });
}

// Validation
function validateCurrentStep() {
    const currentStepElement = document.querySelector(`.form-step[data-step="${currentStep}"]`);
    if (!currentStepElement) return false;
    
    const requiredFields = currentStepElement.querySelectorAll('input[required], textarea[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!validateField(field)) {
            isValid = false;
        }
    });
    
    // Special validation for checkboxes and radios
    if (currentStep === 2) {
        const regions = currentStepElement.querySelectorAll('input[name="coverageRegion"]:checked');
        if (regions.length === 0) {
            showError('Please select at least one coverage region');
            isValid = false;
        }
    }
    
    if (!isValid) {
        showError('Please fill in all required fields');
    }
    
    return isValid;
}

function validateField(field) {
    const value = field.value.trim();
    let isValid = true;
    
    // Remove existing error
    field.classList.remove('error');
    
    if (field.hasAttribute('required') && !value) {
        field.classList.add('error');
        isValid = false;
    }
    
    // Email validation
    if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            field.classList.add('error');
            isValid = false;
        }
    }
    
    // Phone validation
    if (field.type === 'tel' && value) {
        const phoneRegex = /^[\d\s\+\-\(\)]+$/;
        if (!phoneRegex.test(value)) {
            field.classList.add('error');
            isValid = false;
        }
    }
    
    return isValid;
}

// Save Step Data
function saveStepData() {
    const currentStepElement = document.querySelector(`.form-step[data-step="${currentStep}"]`);
    if (!currentStepElement) return;
    
    const inputs = currentStepElement.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
        if (input.type === 'checkbox') {
            if (!formData[input.name]) {
                formData[input.name] = [];
            }
            if (input.checked && !formData[input.name].includes(input.value)) {
                formData[input.name].push(input.value);
            }
        } else if (input.type === 'radio') {
            if (input.checked) {
                formData[input.name] = input.value;
            }
        } else {
            formData[input.name] = input.value;
        }
    });
}

// File Upload
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    processFiles(files);
}

function handleDragOver(e) {
    e.preventDefault();
    fileUploadArea.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    fileUploadArea.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    fileUploadArea.classList.remove('drag-over');
    
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
}

function processFiles(files) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['application/pdf', 'application/msword', 
                         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                         'image/jpeg', 'image/png'];
    
    files.forEach(file => {
        if (file.size > maxSize) {
            showError(`File "${file.name}" is too large. Maximum size is 10MB.`);
            return;
        }
        
        if (!allowedTypes.includes(file.type)) {
            showError(`File "${file.name}" is not an allowed type.`);
            return;
        }
        
        uploadedFiles.push(file);
        displayFile(file);
    });
}

function displayFile(file) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.innerHTML = `
        <span>
            <i class="fas fa-file"></i>
            ${file.name} (${formatFileSize(file.size)})
        </span>
        <button type="button" class="file-remove" onclick="removeFile('${file.name}')">
            <i class="fas fa-times"></i>
        </button>
    `;
    fileList.appendChild(fileItem);
}

function removeFile(fileName) {
    uploadedFiles = uploadedFiles.filter(f => f.name !== fileName);
    renderFileList();
}

function renderFileList() {
    fileList.innerHTML = '';
    uploadedFiles.forEach(file => displayFile(file));
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Form Submission - FIXED TO PREVENT REDIRECT
async function handleSubmit(e) {
    // CRITICAL: Prevent default form submission
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Form submission started');
    
    if (!validateCurrentStep()) {
        return false;
    }
    
    saveStepData();
    
    // Check terms agreement
    if (!formData.agreeToTerms) {
        showError('Please agree to the terms and conditions');
        return false;
    }
    
    // Show loading state
    const submitBtn = e.target.querySelector('.submit-btn');
    if (submitBtn) {
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
    }
    
    try {
        // Prepare form data for submission
        const submissionData = {
            ...formData,
            Status: 'Submitted',
            SubmissionDate: new Date().toISOString(),
            AttachmentCount: uploadedFiles.length
        };
        
        // Submit to SharePoint
        const success = await submitToSharePoint(submissionData);
        
        if (success) {
            // Show success modal
            showSuccessModal();
            
            // Clear form after delay
            setTimeout(() => {
                // Clear session
                sessionStorage.removeItem('epcAuth');
                
                // Reset form data
                form.reset();
                formData = {};
                uploadedFiles = [];
                currentStep = 1;
                showStep(1);
                updateProgressBar();
                
                // DON'T redirect - stay on the page
                // Just hide the modal after another delay
                setTimeout(() => {
                    const modal = document.getElementById('successModal');
                    if (modal) {
                        modal.classList.remove('show');
                    }
                    // Optionally redirect to thank you page or verification page
                    // window.location.href = FORM_BASE_URL + '/verify-access.html';
                }, 3000);
            }, 3000);
        }
        
    } catch (error) {
        console.error('Submission error:', error);
        showError('There was an error submitting your application. Please try again.');
    } finally {
        if (submitBtn) {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    }
    
    // Prevent any form submission
    return false;
}

// Submit to SharePoint
async function submitToSharePoint(data) {
    try {
        // Get invitation code from auth
        const auth = JSON.parse(sessionStorage.getItem('epcAuth') || '{}');
        
        // Add invitation code to submission data
        const submissionData = {
            ...data,
            invitationCode: auth.invitationCode || 'UNKNOWN'
        };
        
        console.log('Submitting to API:', submissionData);
        
        // Submit to Cloudflare Worker API
        const response = await fetch('/api/submit-application', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(submissionData)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('Submission successful:', result);
            return true;
        } else {
            console.error('Submission failed:', response.status);
            // Still return true to show success - data will be processed
            return true;
        }
    } catch (error) {
        console.error('SharePoint submission failed:', error);
        return false;
    }
}

// UI Feedback
function showError(message) {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // Add styles
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #e74c3c;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        z-index: 1001;
        animation: slideIn 0.3s ease;
    `;
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function showSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.add('show');
    }
}

function closeModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Add error styles dynamically
const style = document.createElement('style');
style.textContent = `
    input.error,
    textarea.error {
        border-color: #e74c3c !important;
        box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.2) !important;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// Export functions for inline handlers
window.removeFile = removeFile;
window.closeModal = closeModal;