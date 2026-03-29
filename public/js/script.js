// Navigation scroll and active button
function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        updateActiveButton(sectionId);
    }
}

function updateActiveButton(sectionId) {
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`[onclick="scrollToSection('${sectionId}')"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

// Update active button on scroll
window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section[id]');
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });
    
    if (current) {
        updateActiveButton(current);
    }
});

// Contact form handler
function handleContactForm(event) {
    event.preventDefault();
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const company = document.getElementById('company').value;
    const message = document.getElementById('message').value;
    
    // Prepare email body
    const emailBody = `
Nome: ${name}
Email: ${email}
Telefone: ${phone}
Empresa: ${company}

Mensagem:
${message}
    `.trim();
    
    // Send email via mailto (you can replace this with an API call)
    const mailtoLink = `mailto:contato@liderflow.com.br?subject=Novo Contato - ${encodeURIComponent(name)}&body=${encodeURIComponent(emailBody)}`;
    
    // Alternative: Send via API (uncomment and configure)
    // fetch('/api/contact', {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({
    //         name,
    //         email,
    //         phone,
    //         company,
    //         message
    //     })
    // }).then(response => {
    //     if (response.ok) {
    //         alert('Mensagem enviada com sucesso!');
    //         document.querySelector('form').reset();
    //     }
    // });
    
    // Show success message
    alert('Obrigado pelo contato! Sua mensagem será enviada para contato@liderflow.com.br');
    
    // Reset form
    document.querySelector('form').reset();
}

// Hamburger menu toggle
function toggleMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    
    hamburger.classList.toggle('active');
    mobileMenu.classList.toggle('active');
}

// Close mobile menu when clicking outside
document.addEventListener('click', (event) => {
    const hamburger = document.querySelector('.hamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    const nav = document.querySelector('nav');
    
    if (!nav.contains(event.target)) {
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('active');
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set initial active button
    updateActiveButton('hero');
});
