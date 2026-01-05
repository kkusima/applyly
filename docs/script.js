document.addEventListener('DOMContentLoaded', () => {
    const track = document.querySelector('.carousel-track');
    const slides = Array.from(track.children);
    const nextButton = document.querySelector('.carousel-next');
    const prevButton = document.querySelector('.carousel-prev');
    const dotsNav = document.querySelector('.carousel-nav');

    // Create dots
    slides.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.classList.add('carousel-indicator');
        if (index === 0) dot.classList.add('current-slide');
        dot.addEventListener('click', () => {
            const currentSlide = track.querySelector('.current-slide');
            const targetSlide = slides[index];
            moveToSlide(track, currentSlide, targetSlide, index);
            updateDots(dot);
            hideShowArrows(slides, prevButton, nextButton, index);
        });
        dotsNav.appendChild(dot);
    });

    const dots = Array.from(dotsNav.children);

    // Arrange slides next to one another
    // We rely on CSS flexbox for layout, so no need to set absolute position left.
    // slides.forEach(setSlidePosition); // REMOVED

    const moveToSlide = (track, currentSlide, targetSlide, targetIndex) => {
        track.style.transform = 'translateX(-' + (targetIndex * 100) + '%)';
        currentSlide.classList.remove('current-slide');
        targetSlide.classList.add('current-slide');
    }

    const updateDots = (targetDot) => {
        const currentDot = dotsNav.querySelector('.current-slide');
        currentDot.classList.remove('current-slide');
        targetDot.classList.add('current-slide');
    }

    const hideShowArrows = (slides, prevButton, nextButton, targetIndex) => {
        if (targetIndex === 0) {
            prevButton.classList.add('is-hidden');
            nextButton.classList.remove('is-hidden');
        } else if (targetIndex === slides.length - 1) {
            prevButton.classList.remove('is-hidden');
            nextButton.classList.add('is-hidden');
        } else {
            prevButton.classList.remove('is-hidden');
            nextButton.classList.remove('is-hidden');
        }
    }

    // Initialize
    let currentSlide = slides[0];
    currentSlide.classList.add('current-slide');
    // hide prev button on start
    prevButton.classList.add('is-hidden');

    // Button Listeners
    prevButton.addEventListener('click', e => {
        const currentSlide = track.querySelector('.current-slide');
        const prevSlide = currentSlide.previousElementSibling;
        const currentDot = dotsNav.querySelector('.current-slide');
        const prevDot = currentDot.previousElementSibling;
        const prevIndex = slides.findIndex(slide => slide === prevSlide);

        moveToSlide(track, currentSlide, prevSlide, prevIndex);
        updateDots(prevDot);
        hideShowArrows(slides, prevButton, nextButton, prevIndex);
    });

    nextButton.addEventListener('click', e => {
        const currentSlide = track.querySelector('.current-slide');
        const nextSlide = currentSlide.nextElementSibling;
        const currentDot = dotsNav.querySelector('.current-slide');
        const nextDot = currentDot.nextElementSibling;
        const nextIndex = slides.findIndex(slide => slide === nextSlide);

        moveToSlide(track, currentSlide, nextSlide, nextIndex);
        updateDots(nextDot);
        hideShowArrows(slides, prevButton, nextButton, nextIndex);
    });

    // Dots listeners
    // (Already added in the loop above, but need to update the call to moveToSlide inside the loop)


    // Lightbox
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.querySelector('.lightbox-close');

    slides.forEach(slide => {
        const img = slide.querySelector('img');
        img.addEventListener('click', () => {
            lightbox.classList.add('active');
            lightboxImg.src = img.src;
        });
    });

    closeBtn.addEventListener('click', () => {
        lightbox.classList.remove('active');
    });

    lightbox.addEventListener('click', (e) => {
        if (e.target !== lightboxImg) {
            lightbox.classList.remove('active');
        }
    });
});
