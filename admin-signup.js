document.getElementById('signupForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const industrySelect = document.getElementById('industry');
    const otherIndustryInput = document.getElementById('otherIndustry');


    const companyName = document.getElementById('companyName').value.trim();
    const contactName = document.getElementById('contactName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const industry = document.getElementById('industry').value.trim();
    const location = document.getElementById('location').value.trim();
    const description = document.getElementById('description').value.trim();
    const logoUrl = document.getElementById('logoUrl').value.trim();

    // 🔐 Basic Validation
    if (companyName === '') return alert('Company name is required.');
    if (contactName === '') return alert('Contact person is required.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return alert('Enter a valid email.');
    if (password.length < 6) return alert('Password must be at least 6 characters.');
    if (password !== confirmPassword) return alert('Passwords do not match.');
    if (industry === '') return alert('Industry is required.');
    if (location === '') return alert('Location is required.');
    if (description.length < 10) return alert('Description must be at least 10 characters.');

    const body = {
        name: companyName,
        email,
        password,
        contact_person: contactName,
        industry,
        location,
        description,
        logo_url: logoUrl
    };

    try {
        const res = await fetch('/api/company/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await res.json();

        if (res.ok) {
            alert('Signup successful!');
            window.location.href = 'Admin-Login.html';
        } else {
            alert(data.error || 'Signup failed.');
        }
    } catch (err) {
        console.error(err);
        alert('Server error. Try again later.');
    }
});


industrySelect.addEventListener('change', () => {
    if (industrySelect.value === 'Other') {
        otherIndustryInput.classList.remove('hidden');
        otherIndustryInput.required = true;
    } else {
        otherIndustryInput.classList.add('hidden');
        otherIndustryInput.required = false;
    }
});
function togglePassword(id, icon) {
    const input = document.getElementById(id);
    if (input.type === "password") {
        input.type = "text";
        icon.textContent = "Hide";
    } else {
        input.type = "password";
        icon.textContent = "Show";
    }
}