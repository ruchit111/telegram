const responce = await fetch(
     `${API_URL}/api/telegram-submit`,
     {
        method: "POST",

        header: {
            "content-type": "application/json"
        },

        body: JSON.strigify({
            name : Form.name.trim(),
            email : Form.email.trim(),
            phone : Form.phone.trim(),
            company : Form.company.trim(),
            message : Form.message.trim()
        })
     }
);