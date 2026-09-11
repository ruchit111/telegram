    import { useState } from "react";

    const api_url = import.meta.env.VITE_API_URL  || "http://localhost:5000";

    const initialForm = {
        name: "",
        email: "",
        phone: "",
        company: "",
        message: "",
    };  

    function App() {
        const [form , setForm] = useState(initialForm);

        const [errors , seterrors]  = useState({});

        const [status , setstatus] = useState({
            type: "",
            message : ""
        });

         const [isSubmitting, setIsSubmitting] = useState(false);
        const [telegramUrl, setTelegramUrl] = useState("");


         // handel input changes    

         const handelchanges = (event) => {
            const {name , value} = event.target;


            setForm((previousForm)=> ({
                ...previousForm,
                [name] : value
            }));

            //remove error when user starts fixing fileads

            if (errors[name]) {
                seterrors((previousForm)=> ({
                    ...previousForm,
                    [name]: ""
                }));
            }

         }



         // validate form


         const validateform = () => {
            const newerror = {};


            //name 
            if(!form.name.trim()) {
                newerror.name = "name is required."
            }

            // email 

            if(!form.email.trim()) {
                newerror.email = " email is required. "
            }else if(
                   !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
            ) {
                newerror.email = "please enter a valid emial address"
            }

            //phone

            if (!form.phone.trim()) {
                newerror.phone = " phone number is required. "
            }

            if (form.name.trim().length > 30) {
              newerror.name = "name must be 30 characters or fewer."
            }

            if (form.email.trim().length > 50) {
              newerror.email = "email must be 50 characters or fewer."
            }

            if (form.phone.trim().length > 11) {
              newerror.phone = "phone must be 11 characters or fewer."
            }

            if (form.company.trim().length > 50) {
              newerror.company = "company must be 50 characters or fewer."
            }


            // message

            if(!form.message.trim()) {
                newerror.message = " message is required."
            }

            if (form.message.trim().length > 400) {
              newerror.message = "message must be 400 characters or fewer."
            }

            seterrors(newerror);

            return Object.keys(newerror).length === 0;

         };



         // submit form

         const handelsubmit = async (event) => {
            event.preventDefault();


            // prevent  duplicate submission 

            if (isSubmitting) {
                return;
            }


            // clear old status

            setstatus({
                type: "",
                message: ""
            });
            setTelegramUrl("");


            //validate form

            const isvalid = validateform();

            if(!isvalid){
                return;
            }

            //start loadding 
            setIsSubmitting(true);

            try{
                const response = await fetch(
                    `${api_url}/api/telegram-submit`,
                    {
                        method : "POST",

                        headers :{
                            "Content-Type" : "application/json"
                        },

                        body : JSON.stringify({
                          name: form.name.trim(),
                          email: form.email.trim(),
                          phone: form.phone.trim(),
                          company: form.company.trim(),
                          message: form.message.trim()
                        })


                    }
                );

                const result = await response.json().catch(() => ({
                  success: false,
                  message: `Server returned HTTP ${response.status}.`,
                }));

                if(!response.ok || !result.success) {
                    throw new Error(
                        result.message || "unable to send form. please try again"
                    );
                }


                // sucess

                setstatus({
                    type : "success",
                    message : result.message || "Form submitted successfully."
                });
                setTelegramUrl(result.telegramUrl || "");


                // claer form 

                setForm(initialForm);

                // clear validation error

                seterrors({});
            }catch (error) {
                setstatus({
                    type: "error",
                    message: error.message || "Something went wrong. Please try again."
                });
            }finally {
                setIsSubmitting(false);
            }
            };


            return (
    <main className="app">
      <section className="form-container" aria-labelledby="form-title">

        <aside className="intro-panel">
          <div className="brand-mark" aria-hidden="true">↗</div>
          <p className="eyebrow">Direct line</p>
          <h1>Let&apos;s make something useful.</h1>
          <p className="intro-copy">
            Share the details and your message will land safely in our Telegram workspace.
          </p>
          <div className="delivery-note">
            <span className="delivery-dot" aria-hidden="true" />
            <span>Secure server-side delivery</span>
          </div>
        </aside>

        <div className="form-content">

        {/* Header */}

        <div className="form-header">
          <div className="badge">Contact form</div>

          <h2 id="form-title">Send  message</h2>

          <p>
            Required fields are marke with an asterisk.
          </p>
        </div>

        {/* Form */}

        <form
          className="contact-form"
          onSubmit={handelsubmit}
          noValidate
        >

          {/* Name */}

          <div className="form-group">
            <label htmlFor="name">
              Name <span>*</span>
            </label>

            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handelchanges}
              placeholder="Enter your name"
              autoComplete="name"
              disabled={isSubmitting}
            />

            {errors.name && (
              <p className="error-text">
                {errors.name}
              </p>
            )}
          </div>

          {/* Email */}

          <div className="form-group">
            <label htmlFor="email">
              Email <span>*</span>
            </label>

            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handelchanges}
              placeholder="Enter your email"
              autoComplete="email"
              disabled={isSubmitting}
            />

            {errors.email && (
              <p className="error-text">
                {errors.email}
              </p>
            )}
          </div>

          {/* Phone */}

          <div className="form-group">
            <label htmlFor="phone">
              Phone <span>*</span>
            </label>

            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handelchanges}
              placeholder="Enter your phone number"
              autoComplete="tel"
              disabled={isSubmitting}
            />

            {errors.phone && (
              <p className="error-text">
                {errors.phone}
              </p>
            )}
          </div>

          {/* Company */}

          <div className="form-group">
            <label htmlFor="company">
              Company
            </label>

            <input
              id="company"
              name="company"
              type="text"
              value={form.company}
              onChange={handelchanges}
              placeholder="Enter your company name"
              autoComplete="organization"
              disabled={isSubmitting}
            />

            {errors.company && (
              <p className="error-text">
                {errors.company}
              </p>
            )}
          </div>

          {/* Message */}

          <div className="form-group">
            <label htmlFor="message">
              Message <span>*</span>
            </label>

            <textarea
              id="message"
              name="message"
              rows="6"
              value={form.message}
              onChange={handelchanges}
              placeholder="Write your message"
              disabled={isSubmitting}
            />

            {errors.message && (
              <p className="error-text">
                {errors.message}
              </p>
            )}
          </div>

          {/* Success/Error message */}

          {status.message && (
            <div
              className={`status-message ${status.type}`}
              role={
                status.type === "error"
                  ? "alert"
                  : "status"
              }
            >
              {status.message}
              {status.type === "success" && telegramUrl && (
                <a className="telegram-link" href={telegramUrl} target="_blank" rel="noreferrer">
                  Open Telegram <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
          )}

          {/* Submit */}

          <button
            type="submit"
            className="submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Sending..."
              : "Submit Form"}
          </button>

        </form>
        </div>
      </section>
    </main>
  );
}

          
    export default App; 
