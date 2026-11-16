import { For, Show } from 'solid-js';
import { ContactLinks, ServiceAreaList } from '../components/Layout';
import { ContactForm } from '../components/estimate/Estimate';
import { site } from '../shared/content';

export function Contact() {
  return <main id="main-content" tabindex="-1" class="shell support-page contact-page" data-reveal-group="" data-reveal-children="">
    <section class="contact-details" aria-labelledby="contact-title">
      <h1 id="contact-title">Contact Us</h1>
      <section aria-labelledby="contact-areas-title">
        <h2 id="contact-areas-title">Service Areas</h2>
        <ServiceAreaList />
      </section>
      <section aria-labelledby="contact-information-title">
        <h2 id="contact-information-title">Contact Information</h2>
        <ContactLinks details />
      </section>
      <section class="contact-hours" aria-labelledby="contact-hours-title">
        <h2 id="contact-hours-title">Business Hours</h2>
        <p>Eastern Time</p>
        <dl>
          <For each={Object.entries(site.businessHours)}>{([day, hours]) => <div><dt>{day}</dt><dd>{hours}</dd></div>}</For>
        </dl>
      </section>
    </section>
    <section id="estimate-contact" class="contact-panel rounded" aria-label="Contact form">
      <noscript><p class="fallback-note">To send a message with JavaScript disabled, please email us.</p></noscript>
      <ContactForm />
    </section>
  </main>;
}

export function Legal(props: { type: 'privacy' | 'terms' }) {
  return <main id="main-content" tabindex="-1" class="shell support-page legal-page" data-reveal-group="">
    <Show when={props.type === 'privacy'} fallback={<>
      <h1>Terms and Conditions</h1>
      <p>These terms apply to your use of this website and its inquiry forms. {site.legalName} operates this website as {site.businessName}.</p>

      <h2>Estimate Requests</h2>
      <p>We review inquiries based on service area, project fit, and availability. Submitting an inquiry authorizes Frame &amp; Finish to respond by phone or email about your request. An inquiry does not book work or guarantee an estimate, price, or start date. Marketing email is a separate, optional choice. See our <a href="/privacy">Privacy Policy</a> for how we handle inquiry information.</p>

      <h2>Project Agreements</h2>
      <p>Your remodeling agreement is with the parties identified in the agreement as providing the remodeling services. Those parties receive payment directly and are responsible for the work, job site management, and applicable warranties.</p>
      <p>Preliminary estimates are subject to the signed project agreement, which governs the price, scope, scheduling, and changes to the work.</p>

      <h2>Website Content and Acceptable Use</h2>
      <p>You may browse the site and submit inquiries for your own use. Website text, images, and branding are owned by Frame &amp; Finish or used with permission. You may not republish them commercially or imply our endorsement without permission. Do not impersonate others, submit false information, send spam, bypass security measures, or interfere with the site. We may restrict misuse and change or discontinue website features.</p>
      <p><a href="https://fontawesome.com/">Font Awesome Free</a> icons by Fonticons, Inc. are licensed under <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.</p>

      <h2>Reliance and Liability</h2>
      <p>Website content is general information. We do not warrant that the site will always be available or that all content will remain current. To the extent permitted by applicable law, Frame &amp; Finish is not liable for indirect or consequential losses arising from use of this website. You retain all nonwaivable rights and remedies under applicable law.</p>

      <h2>Changes to These Terms</h2>
      <p>We may update these terms by posting the revised version here. Updates apply to future use of the website.</p>
    </>}>
      <h1>Privacy Policy</h1>
      <p>This policy describes how {site.legalName}, doing business as {site.businessName}, handles information about website visitors and people who inquire about remodeling services or work with us on a project.</p>

      <h2>Information We Collect</h2>
      <p>We receive information from you and may receive contact and project details from lead providers and referral partners. We may collect your name, email address, phone number, property address or ZIP code, and the project details you provide. We may also keep records of inquiries, communications, estimates, agreements, and your contact preferences or consent.</p>

      <h2>How We Use Information</h2>
      <p>We use this information to review inquiries, check service coverage, arrange visits, coordinate estimates and agreements, and communicate about your project. We also use information to maintain business records, prevent misuse, meet legal obligations, and resolve disputes. If you opt in to marketing email, we may send you news or offers. You can unsubscribe using the link in those messages or by emailing us.</p>

      <h2>Website Usage and Analytics</h2>
      <p>We may process technical information, such as IP addresses, to operate and secure the site. When enabled, our analytics measure page visits and performance without cookies or form entries.</p>
      <p>Your browser may save draft entries on your device so it can refill our forms. After a successful submission, the site clears the submitted project fields from the draft and retains your contact details and ZIP code for future visits. You can remove saved entries by clearing this site’s data in your browser settings.</p>

      <h2>When We Share Information</h2>
      <p>We may share information reasonably necessary for your requested services with trusted third parties, including parties who may be contracted to assist with your project and service providers who support our operations. Parties engaged for your project may receive contact and project details, including estimates and agreements. Service providers may handle those records, communications, and technical information for services such as recordkeeping, email delivery, hosting, security, and analytics.</p>
      <p>Where we previously promised to obtain your permission before sharing project details, we will do so. We may also disclose information when required by law or when reasonably necessary to protect rights or safety or investigate fraud.</p>

      <h2>Retention and Security</h2>
      <p>We retain information for as long as reasonably needed to handle your inquiry or project, maintain business records, resolve disputes, or meet legal obligations. We use reasonable safeguards appropriate to the information we handle. Keep payment card numbers and other sensitive information out of website forms.</p>

      <h2>Privacy Requests and Appeals</h2>
      <p>Where provided by applicable law, you may request confirmation and access, correction, deletion, or a portable copy of your information. You may also have the right to opt out of the sale of personal information, targeted advertising, or profiling used for decisions with significant effects.</p>
      <p>To submit a privacy request or appeal a decision on a request, email us using the address below or use our <a href="/contact#estimate-contact">contact form</a>. Identify the request or appeal in your message. We may verify your identity as permitted by law.</p>

      <h2>Changes to This Policy</h2>
      <p>We may update this policy as our practices change. The current version will be posted on this page.</p>
    </Show>
    <Show when={site.email}>{email => <><h2>Contact</h2><p>For questions, email <a href={`mailto:${email()}`}>{email()}</a>.</p></>}</Show>
  </main>;
}

export function NotFound() {
  return <main id="main-content" tabindex="-1" class="shell support-page" data-reveal-group=""><h1>Page Not Found</h1><p>Return to the homepage to explore remodeling services.</p><a href="/" class="button button-primary rounded">Back to homepage</a></main>;
}
