import { db } from './firebase-config.js';
import { 
    collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, 
    where, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

// DOM Elements
const loginContainer = document.getElementById('loginContainer');
const dashboardContainer = document.getElementById('dashboardContainer');
const loginButton = document.getElementById('loginButton');
const logoutButton = document.getElementById('logoutButton');
const username = document.getElementById('username');
const password = document.getElementById('password');
const loginError = document.getElementById('loginError');
const imageUpload = document.getElementById('imageUpload');
const dropZone = document.getElementById('dropZone');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');
const removeImage = document.getElementById('removeImage');
const addProductBtn = document.getElementById('addProductBtn');
const srNo = document.getElementById('srNo');
const uploadProgress = document.getElementById('uploadProgress');
const progressBar = document.getElementById('progressBar');
const progressStatus = document.getElementById('progressStatus');
const addError = document.getElementById('addError');
const errorText = document.getElementById('errorText');
const productsTableBody = document.getElementById('productsTableBody');
const tableLoading = document.getElementById('tableLoading');
const noProductsMessage = document.getElementById('noProductsMessage');
const adminSearchInput = document.getElementById('adminSearchInput');
const deleteModal = document.getElementById('deleteModal');
const deleteProductSrNo = document.getElementById('deleteProductSrNo');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

// Constants
const CLOUDINARY_CLOUD_NAME = 'dp9pbmeai';
const CLOUDINARY_UPLOAD_PRESET = 'unsignedpreset';
const CLOUDINARY_FOLDER = 'camk';
const ADMIN_USERNAME = 'kerem';
const ADMIN_PASSWORD = '090909';

// Variables
let selectedFile = null;
let products = [];
let deleteProductId = null;
let isAuthenticated = false;

// Check if user is already logged in from session storage
function checkAuthentication() {
    const auth = sessionStorage.getItem('adminAuthenticated');
    isAuthenticated = auth === 'true';
    
    if (isAuthenticated) {
        loginContainer.classList.add('hidden');
        dashboardContainer.classList.remove('hidden');
        loadProducts();
    }
}

// Login functionality
function setupLogin() {
    loginButton.addEventListener('click', () => {
        const inputUsername = username.value.trim();
        const inputPassword = password.value.trim();
        
        if (inputUsername === ADMIN_USERNAME && inputPassword === ADMIN_PASSWORD) {
            sessionStorage.setItem('adminAuthenticated', 'true');
            isAuthenticated = true;
            loginContainer.classList.add('hidden');
            dashboardContainer.classList.remove('hidden');
            loginError.classList.add('hidden');
            loadProducts();
        } else {
            loginError.classList.remove('hidden');
            password.value = '';
        }
    });
    
    // Also allow login with Enter key
    password.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            loginButton.click();
        }
    });
    
    logoutButton.addEventListener('click', () => {
        sessionStorage.removeItem('adminAuthenticated');
        isAuthenticated = false;
        dashboardContainer.classList.add('hidden');
        loginContainer.classList.remove('hidden');
        username.value = '';
        password.value = '';
    });
}

// File upload & preview functionality
function setupFileUpload() {
    dropZone.addEventListener('click', () => {
        imageUpload.click();
    });
    
    imageUpload.addEventListener('change', handleFileSelect);
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--accent-color)';
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = '';
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '';
        
        if (e.dataTransfer.files.length) {
            handleFiles(e.dataTransfer.files);
        }
    });
    
    removeImage.addEventListener('click', () => {
        clearImageSelection();
    });
}

function handleFileSelect(e) {
    if (e.target.files.length) {
        handleFiles(e.target.files);
    }
}

function handleFiles(files) {
    if (files.length === 0) return;
    
    const file = files[0];
    
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
        showAddError('Lütfen bir resim dosyası seçin.');
        return;
    }
    
    // Check if file size is less than 10 MB
    if (file.size > 10 * 1024 * 1024) {
        showAddError('Dosya boyutu 10 MB\'dan küçük olmalıdır.');
        return;
    }
    
    selectedFile = file;
    
    // Show image preview
    const reader = new FileReader();
    reader.onload = (e) => {
        imagePreview.src = e.target.result;
        dropZone.classList.add('hidden');
        imagePreviewContainer.classList.remove('hidden');
        hideAddError();
    };
    reader.readAsDataURL(file);
}

function clearImageSelection() {
    selectedFile = null;
    imageUpload.value = '';
    imagePreviewContainer.classList.add('hidden');
    dropZone.classList.remove('hidden');
}

// Product operations
function setupProductOperations() {
    addProductBtn.addEventListener('click', async () => {
        if (!isAuthenticated) return;
        
        const productSrNo = srNo.value.trim();
        
        if (!productSrNo) {
            showAddError('Lütfen SR No girin.');
            return;
        }
        
        if (!selectedFile) {
            showAddError('Lütfen bir ürün fotoğrafı seçin.');
            return;
        }
        
        // Check if SR No already exists
        const existingProduct = products.find(p => p.srNo === productSrNo);
        if (existingProduct) {
            showAddError('Bu SR No zaten kullanılıyor.');
            return;
        }
        
        try {
            uploadProgress.classList.remove('hidden');
            addProductBtn.disabled = true;
            
            // Upload image to Cloudinary
            const imageUrl = await uploadImageToCloudinary(selectedFile);
            
            // Save product to Firestore
            await addDoc(collection(db, 'products'), {
                srNo: productSrNo,
                imageUrl: imageUrl,
                createdAt: new Date()
            });
            
            // Reset form
            srNo.value = '';
            clearImageSelection();
            uploadProgress.classList.add('hidden');
            progressBar.style.width = '0%';
            progressStatus.textContent = 'Yükleniyor... 0%';
            addProductBtn.disabled = false;
            
            // Show success message
            showAddError('Ürün başarıyla eklendi.', 'success');
            
            // Hide success message after 3 seconds
            setTimeout(() => {
                hideAddError();
            }, 3000);
            
        } catch (error) {
            console.error('Error adding product:', error);
            uploadProgress.classList.add('hidden');
            addProductBtn.disabled = false;
            showAddError('Ürün eklenirken bir hata oluştu.');
        }
    });
}

async function uploadImageToCloudinary(file) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('folder', CLOUDINARY_FOLDER);
        
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, true);
        
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                progressBar.style.width = percentComplete + '%';
                progressStatus.textContent = `Yükleniyor... ${percentComplete}%`;
            }
        };
        
        xhr.onload = function() {
            if (this.status >= 200 && this.status < 300) {
                const response = JSON.parse(this.responseText);
                resolve(response.secure_url);
            } else {
                reject('Resim yüklenemedi.');
            }
        };
        
        xhr.onerror = function() {
            reject('Resim yüklenirken bir hata oluştu.');
        };
        
        xhr.send(formData);
    });
}

async function loadProducts() {
    if (!isAuthenticated) return;
    
    tableLoading.classList.remove('hidden');
    noProductsMessage.classList.add('hidden');
    productsTableBody.innerHTML = '';
    
    try {
        // Setup real-time listener
        const productsCollection = collection(db, 'products');
        const q = query(productsCollection, orderBy('srNo'));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            products = [];
            querySnapshot.forEach((doc) => {
                products.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            renderProducts(products);
            tableLoading.classList.add('hidden');
            
            if (products.length === 0) {
                noProductsMessage.classList.remove('hidden');
            } else {
                noProductsMessage.classList.add('hidden');
            }
        });
        
    } catch (error) {
        console.error('Error loading products:', error);
        tableLoading.classList.add('hidden');
        noProductsMessage.textContent = 'Ürünler yüklenirken bir hata oluştu.';
        noProductsMessage.classList.remove('hidden');
    }
}

function renderProducts(productsToRender) {
    productsTableBody.innerHTML = '';
    
    if (productsToRender.length === 0) {
        noProductsMessage.classList.remove('hidden');
        return;
    }
    
    productsToRender.forEach((product) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <img src="${product.imageUrl}" alt="${product.srNo}" class="product-thumbnail">
            </td>
            <td>${product.srNo}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn delete-action-btn" data-id="${product.id}" data-sr="${product.srNo}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        productsTableBody.appendChild(row);
    });
    
    // Add event listeners to delete buttons
    const deleteButtons = document.querySelectorAll('.delete-action-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', () => {
            const productId = button.getAttribute('data-id');
            const productSrNo = button.getAttribute('data-sr');
            openDeleteModal(productId, productSrNo);
        });
    });
}

function setupSearch() {
    adminSearchInput.addEventListener('input', () => {
        const searchQuery = adminSearchInput.value.trim().toLowerCase();
        
        if (searchQuery === '') {
            renderProducts(products);
            return;
        }
        
        const filteredProducts = products.filter(product => 
            product.srNo.toLowerCase().includes(searchQuery)
        );
        
        renderProducts(filteredProducts);
    });
}

function setupDeleteModal() {
    cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    
    confirmDeleteBtn.addEventListener('click', async () => {
        if (!deleteProductId) return;
        
        try {
            await deleteDoc(doc(db, 'products', deleteProductId));
            closeDeleteModal();
        } catch (error) {
            console.error('Error deleting product:', error);
            // Show error message in modal
        }
    });
}

function openDeleteModal(productId, productSrNo) {
    deleteProductId = productId;
    deleteProductSrNo.textContent = productSrNo;
    deleteModal.style.display = 'flex';
}

function closeDeleteModal() {
    deleteModal.style.display = 'none';
    deleteProductId = null;
}

// Helper functions
function showAddError(message, type = 'error') {
    errorText.textContent = message;
    addError.classList.remove('hidden');
    
    if (type === 'success') {
        addError.style.backgroundColor = '#e8f5e9';
        addError.style.borderLeftColor = '#2ecc71';
        errorText.style.color = '#2ecc71';
    } else {
        addError.style.backgroundColor = '#fdedec';
        addError.style.borderLeftColor = '#e74c3c';
        errorText.style.color = '#e74c3c';
    }
}

function hideAddError() {
    addError.classList.add('hidden');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    setupLogin();
    setupFileUpload();
    setupProductOperations();
    setupSearch();
    setupDeleteModal();
});