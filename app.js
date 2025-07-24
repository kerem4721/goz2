import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

// DOM Elements
const gallery = document.getElementById('gallery');
const productModal = document.getElementById('productModal');
const modalImage = document.getElementById('modalImage');
const modalSrNo = document.getElementById('modalSrNo');
const whatsappButton = document.getElementById('whatsappButton');
const closeModal = document.querySelector('.close-modal');
const searchInput = document.getElementById('searchInput');

let products = [];
let currentProduct = null;
let scale = 1;
let translateX = 0;
let translateY = 0;
let isDragging = false;
let startX, startY;

// Fetch products from Firestore
async function fetchProducts() {
    try {
        const productsCollection = collection(db, 'products');
        const productsQuery = query(productsCollection, orderBy('srNo'));
        const querySnapshot = await getDocs(productsQuery);
        
        products = [];
        querySnapshot.forEach((doc) => {
            products.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        renderProducts(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        gallery.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Ürünler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.</p>
            </div>
        `;
    }
}

// Render products in gallery
function renderProducts(productsToRender) {
    if (productsToRender.length === 0) {
        gallery.innerHTML = `
            <div class="no-products">
                <i class="fas fa-search"></i>
                <p>Hiç ürün bulunamadı.</p>
            </div>
        `;
        return;
    }
    
    gallery.innerHTML = productsToRender.map(product => `
        <div class="product-card" data-id="${product.id}">
            <div class="product-image-container">
                <img src="${product.imageUrl}" alt="${product.srNo}" class="product-image">
            </div>
            <div class="product-info">
                <h3>SR No: ${product.srNo}</h3>
                <button class="whatsapp-btn" data-sr="${product.srNo}">
                    <i class="fab fa-whatsapp"></i> WhatsApp'tan Sipariş Et
                </button>
            </div>
        </div>
    `).join('');
    
    // Add event listeners to new cards
    addProductCardListeners();
}

// Filter products by SR No
function filterProducts(query) {
    if (!query.trim()) {
        renderProducts(products);
        return;
    }
    
    const filteredProducts = products.filter(product => 
        product.srNo.toLowerCase().includes(query.toLowerCase())
    );
    
    renderProducts(filteredProducts);
}

// Add event listeners to product cards
function addProductCardListeners() {
    const productCards = document.querySelectorAll('.product-card');
    const whatsappBtns = document.querySelectorAll('.product-info .whatsapp-btn');
    
    productCards.forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('whatsapp-btn')) {
                const productId = card.getAttribute('data-id');
                openProductModal(productId);
            }
        });
    });
    
    whatsappBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const srNo = btn.getAttribute('data-sr');
            openWhatsApp(srNo);
        });
    });
}

// Open product modal
function openProductModal(productId) {
    currentProduct = products.find(p => p.id === productId);
    if (!currentProduct) return;
    
    // Reset zoom and position
    scale = 1;
    translateX = 0;
    translateY = 0;
    
    modalImage.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
    modalImage.src = currentProduct.imageUrl;
    modalSrNo.textContent = `SR No: ${currentProduct.srNo}`;
    whatsappButton.setAttribute('data-sr', currentProduct.srNo);
    
    productModal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
}

// Close product modal
function closeProductModal() {
    productModal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Enable scrolling again
    currentProduct = null;
}

// Open WhatsApp with message
function openWhatsApp(srNo) {
    const phoneNumber = '+905425969558';
    const message = `Merhaba, SR No: ${srNo} olan gözlüğü sipariş vermek istiyorum.`;
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

// Zoom and pan functionality for modal image
function setupZoomAndPan() {
    const zoomContainer = document.querySelector('.zoom-container');
    
    // Mouse wheel zoom
    zoomContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        const delta = e.deltaY * -0.01;
        const newScale = Math.max(1, Math.min(5, scale + delta));
        
        // Only zoom if scale is changing
        if (newScale !== scale) {
            // Calculate mouse position relative to image
            const rect = modalImage.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Calculate how much we're zooming
            const zoomFactor = newScale / scale;
            
            // Update the translation to zoom into mouse position
            translateX = mouseX - (mouseX - translateX) * zoomFactor;
            translateY = mouseY - (mouseY - translateY) * zoomFactor;
            
            scale = newScale;
            
            // Apply the transformation
            modalImage.style.transform = `scale(${scale}) translate(${translateX / scale}px, ${translateY / scale}px)`;
            
            // Change cursor based on scale
            modalImage.style.cursor = scale > 1 ? 'grab' : 'zoom-in';
        }
    });
    
    // Mouse drag pan when zoomed in
    modalImage.addEventListener('mousedown', (e) => {
        if (scale > 1) {
            isDragging = true;
            startX = e.clientX - translateX;
            startY = e.clientY - translateY;
            modalImage.style.cursor = 'grabbing';
        }
    });
    
    modalImage.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        
        modalImage.style.transform = `scale(${scale}) translate(${translateX / scale}px, ${translateY / scale}px)`;
    });
    
    modalImage.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            modalImage.style.cursor = scale > 1 ? 'grab' : 'zoom-in';
        }
    });
    
    modalImage.addEventListener('mouseleave', () => {
        if (isDragging) {
            isDragging = false;
            modalImage.style.cursor = scale > 1 ? 'grab' : 'zoom-in';
        }
    });
    
    // Touch support for mobile devices
    modalImage.addEventListener('touchstart', (e) => {
        if (scale > 1 && e.touches.length === 1) {
            isDragging = true;
            startX = e.touches[0].clientX - translateX;
            startY = e.touches[0].clientY - translateY;
        }
    });
    
    modalImage.addEventListener('touchmove', (e) => {
        if (!isDragging || e.touches.length !== 1) return;
        
        translateX = e.touches[0].clientX - startX;
        translateY = e.touches[0].clientY - startY;
        
        modalImage.style.transform = `scale(${scale}) translate(${translateX / scale}px, ${translateY / scale}px)`;
    });
    
    modalImage.addEventListener('touchend', () => {
        isDragging = false;
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    setupZoomAndPan();
    
    closeModal.addEventListener('click', closeProductModal);
    
    whatsappButton.addEventListener('click', () => {
        if (currentProduct) {
            openWhatsApp(currentProduct.srNo);
        }
    });
    
    // Close modal when clicking outside of content
    productModal.addEventListener('click', (e) => {
        if (e.target === productModal) {
            closeProductModal();
        }
    });
    
    // ESC key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeProductModal();
        }
    });
    
    // Search functionality
    searchInput.addEventListener('input', () => {
        filterProducts(searchInput.value);
    });
});