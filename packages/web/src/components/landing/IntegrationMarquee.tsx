import Image from "next/image";

const integrations = ["Base", "World ID", "Self"] as const;

function IntegrationSet() {
  return (
    <div className="integration-marquee-set" aria-hidden="true">
      <div className="integration-logo integration-logo-base">
        <Image
          src="/brand/logo-base-lockup.svg"
          alt=""
          width={160}
          height={41}
          className="h-auto w-[8.75rem]"
        />
      </div>
      <div className="integration-logo integration-logo-world">
        <Image
          src="/brand/logo-world-id.svg"
          alt=""
          width={44}
          height={44}
          className="h-10 w-10"
        />
        <span>World ID</span>
      </div>
      <div className="integration-logo integration-logo-self">
        <Image
          src="/brand/logo-self-lockup.svg"
          alt=""
          width={144}
          height={54}
          className="h-auto w-[8.5rem]"
        />
      </div>
    </div>
  );
}

export default function IntegrationMarquee() {
  return (
    <section className="integration-marquee" aria-labelledby="integration-heading">
      <h2 id="integration-heading" className="sr-only">
        Built with Base, World ID and Self
      </h2>
      <ul className="sr-only">
        {integrations.map((integration) => (
          <li key={integration}>{integration}</li>
        ))}
      </ul>
      <div className="integration-marquee-viewport">
        <div className="integration-marquee-track">
          <IntegrationSet />
          <IntegrationSet />
        </div>
      </div>
    </section>
  );
}
