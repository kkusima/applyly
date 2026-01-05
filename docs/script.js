document.addEventListener('DOMContentLoaded', () => {
    // Lightbox Logic
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.querySelector('.lightbox-close');
    const galleryImages = document.querySelectorAll('.gallery-item img');

    // Open Lightbox
    galleryImages.forEach(img => {
        img.addEventListener('click', () => {
            lightbox.classList.add('active');
            lightboxImg.src = img.src;
            lightboxImg.alt = img.alt;
        });
    });

    // Close Lightbox (Button)
    closeBtn.addEventListener('click', () => {
        lightbox.classList.remove('active');
    });

    // Close Lightbox (Click Background)
    lightbox.addEventListener('click', (e) => {
        if (e.target !== lightboxImg) {
            lightbox.classList.remove('active');
        }
    });

    // Close Lightbox (Escape Key)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            lightbox.classList.remove('active');
        }
    });
});
