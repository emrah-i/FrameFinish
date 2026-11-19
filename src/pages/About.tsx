import { Photo } from '../components/Photo';
import { photos } from '../shared/content';

export default function About() {
  return <main id="main-content" tabindex="-1" class="shell support-page about-page" data-reveal-group="">
    <h1>About Us</h1>
    <div class="about-layout" data-reveal-group="" data-reveal-children="">
      <Photo image={photos.kitchen} priority sizes="(max-width: 780px) 92vw, 45vw" class="about-photo rounded" />
      <div class="about-copy">
        <section aria-labelledby="about-story-title">
          <h2 id="about-story-title">Our Story</h2>
          <p>My name is <strong>Adam Blackwood</strong>, and I'm proud to carry on the foundation my father established in <strong>2006</strong>. For over 20 years, we've helped homeowners throughout <strong>Dallas, Texas</strong>, and surrounding communities improve their homes through quality remodeling and personalized service.</p>
          <p>Today, we maintain the same commitment to quality craftsmanship and personal service that has guided the business from the beginning. We approach every home remodeling project with clear communication, careful planning, and attention to detail.</p>
          <p>Our team brings hands-on experience to <a href="/services/kitchen"><strong>kitchen remodeling</strong></a>, <a href="/services/bathroom"><strong>bathroom remodeling</strong></a>, and <a href="/services/flooring"><strong>flooring</strong></a>. Whether you're updating one room or several, our goal is to deliver quality results that reflect your priorities and make your home work better for you.</p>
        </section>
        <section aria-labelledby="about-mission-title">
          <h2 id="about-mission-title">Our Mission</h2>
          <p>Our mission is to create the home you envision through expert craftsmanship, thoughtful planning, and clear communication.</p>
          <p>Our motto, <strong>Better Homes, Better Living</strong>, reflects our belief that a home built around your needs can make everyday life better. We bring your ideas to life through expert craftsmanship, creating spaces that look the way you want and work for the way you live. From the first conversation to the final details, we focus on the quality that makes those improvements last.</p>
        </section>
        <a class="button button-primary quote-action rounded" href="/contact">Connect With Us</a>
      </div>
    </div>
  </main>;
}
