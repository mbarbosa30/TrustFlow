export default function TermsPrivacy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <h1 className="text-3xl font-bold mb-8">Terms of Service & Privacy Policy</h1>
        
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 border-b pb-2">Terms of Service</h2>
          
          <p className="text-sm text-muted-foreground mb-6">
            <strong>Effective date:</strong> October 28, 2025<br />
            <strong>Entity:</strong> MaxFlow ("MaxFlow," "we," "us")
          </p>

          <h3 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h3>
          <p className="mb-6">
            By accessing MaxFlow's website, API, or smart-contract interfaces (collectively, the "Service"), you agree to these Terms and our Privacy Policy. If you do not agree, do not use the Service.
          </p>

          <h3 className="text-xl font-semibold mb-3">2. What MaxFlow Is (and Isn't)</h3>
          <p className="mb-6">
            MaxFlow publishes <strong>world-verifiable endorsements</strong> ("VOUCH" statements) and computes <strong>Sybil-resistant trust metrics</strong> via a max-flow/min-cut algorithm. We publish per-epoch manifests so anyone can recompute results.
            <br /><br />
            <strong>MaxFlow is not</strong> a bank, broker, insurer, credit bureau, rating agency, or fiduciary; outputs are <strong>probabilistic signals</strong>, not advice or guarantees.
          </p>

          <h3 className="text-xl font-semibold mb-3">3. Eligibility; Accounts</h3>
          <p className="mb-6">
            You must (a) be legally competent to contract, and (b) use the Service in compliance with applicable laws. You may link wallets or DIDs; you are responsible for securing your keys/devices.
          </p>

          <h3 className="text-xl font-semibold mb-3">4. Public Endorsements; Immutability</h3>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>Endorsements are public and permanent.</strong> A VOUCH is a signed, on-chain or off-chain EIP-712 message stored in an <strong>append-only transparency log</strong> (with Merkle proofs).</li>
            <li>You may file a <strong>revocation</strong> (tombstone) to signal withdrawal going forward, but historical entries remain auditable to preserve reproducibility and anti-tampering guarantees.</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">5. Scores, Attestations, and Use</h3>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>The Service may output per-epoch <strong>scores</strong> (e.g., STS 0–100), acceptance flags, and attestations (JWT/VC or EAS).</li>
            <li>Scores may change between epochs. Parameters (policy id, capacities) may change after a public timelock.</li>
            <li><strong>You and relying parties</strong> bear responsibility for how outputs are used; do not use MaxFlow alone for <strong>high-stakes decisions</strong> (employment, housing, medical, safety-critical systems, or legal determinations).</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">6. Acceptable Use</h3>
          <p className="mb-3">You agree not to:</p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Engage in <strong>Sybil farming</strong>, identity fraud, deception, brigading, or manipulative behavior.</li>
            <li>Spam, harass, defame, or dox others.</li>
            <li>Attack Service integrity (DDoS, exploit attempts) except via good-faith disclosure under our Security Policy.</li>
            <li>Misrepresent affiliations or forge signatures.</li>
          </ul>
          <p className="mb-6">We may throttle, flag, or block usage to protect integrity.</p>

          <h3 className="text-xl font-semibold mb-3">7. Transparency, Reproducibility, and Third-Party Audits</h3>
          <p className="mb-6">
            We publish signed <strong>epoch bundles</strong> (params, seed list or root, log root, scores) and may support auditor committees. Third parties may recompute and publish validations or critiques; we are <strong>not</strong> responsible for their conclusions.
          </p>

          <h3 className="text-xl font-semibold mb-3">8. API & Rate Limits</h3>
          <p className="mb-6">
            We offer public, read-heavy endpoints and may enforce <strong>fair-use limits</strong>. Do not scrape in a manner that degrades service. Use our proofs rather than refetching full datasets when possible.
          </p>

          <h3 className="text-xl font-semibold mb-3">9. Intellectual Property</h3>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>You retain rights in your content (e.g., profile text).</li>
            <li>You grant us a worldwide, non-exclusive, royalty-free license to store, publish, and display your <strong>endorsements</strong> and related cryptographic material for transparency and verification.</li>
            <li>Our code, docs, and brand are protected; some components may be open-sourced under their own licenses.</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">10. Tokens / Claims (If Enabled Later)</h3>
          <p className="mb-6">
            Any future <strong>points/tokens/claims</strong> distribution will have separate terms. Participation may be restricted by jurisdiction and compliance rules. Nothing herein constitutes an offer or solicitation.
          </p>

          <h3 className="text-xl font-semibold mb-3">11. Disclaimers</h3>
          <p className="mb-6 uppercase text-xs">
            THE SERVICE AND OUTPUTS ARE PROVIDED "AS IS." WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT SCORES ARE ERROR-FREE OR SUITABLE FOR ANY PARTICULAR DECISION.
          </p>

          <h3 className="text-xl font-semibold mb-3">12. Limitation of Liability</h3>
          <p className="mb-6 uppercase text-xs">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES; OR ANY LOSS OF PROFITS, DATA, OR GOODWILL. OUR AGGREGATE LIABILITY SHALL NOT EXCEED USD 100 OR THE AMOUNT YOU PAID US IN THE PAST 12 MONTHS, WHICHEVER IS GREATER.
          </p>

          <h3 className="text-xl font-semibold mb-3">13. Indemnification</h3>
          <p className="mb-6">
            You agree to indemnify and hold MaxFlow and its contributors harmless from any claims or liabilities arising from your use of the Service, your endorsements, or your violation of these Terms.
          </p>

          <h3 className="text-xl font-semibold mb-3">14. Changes; Termination</h3>
          <p className="mb-6">
            We may update these Terms. Material changes will be posted with a new effective date. We may suspend or terminate access for policy violations or risks to integrity.
          </p>

          <h3 className="text-xl font-semibold mb-3">15. Governing Law; Dispute Resolution</h3>
          <p className="mb-6">
            These Terms are governed by applicable law. Disputes will be resolved via binding arbitration or courts. You agree to waive class actions to the extent permitted by law.
          </p>

          <h3 className="text-xl font-semibold mb-3">16. Contact</h3>
          <p className="mb-6">
            For legal inquiries, please contact us via our GitHub repository.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 border-b pb-2">Privacy Policy</h2>
          
          <p className="text-sm text-muted-foreground mb-6">
            <strong>Effective date:</strong> October 28, 2025
          </p>

          <p className="mb-6">
            This Privacy Policy explains how MaxFlow processes information in connection with our <strong>public endorsement</strong> system and trust metrics.
          </p>

          <h3 className="text-xl font-semibold mb-3">1. Overview: Privacy in a Transparency System</h3>
          <p className="mb-6">
            MaxFlow aims for <strong>verifiable integrity</strong> with <strong>minimal personal data</strong>. Because endorsements are world-verifiable, certain data is intentionally public and <strong>not erasable</strong> (see §5). We separate <strong>public artifacts</strong> from <strong>optional profile data</strong> and logs.
          </p>

          <h3 className="text-xl font-semibold mb-3">2. What We Collect</h3>
          
          <h4 className="text-lg font-semibold mb-2 mt-4">A) Public by Design</h4>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>Endorsements ("VOUCH" statements):</strong> signer address/DID, subject address/DID, epoch, nonce, signature, and derived hashes (leaf, Merkle).</li>
            <li><strong>Transparency log items:</strong> Merkle roots, inclusion/consistency proofs, Signed Tree Heads (STHs).</li>
            <li><strong>Epoch bundles:</strong> parameter files, seed list or root, score files (STS, acceptance), and signatures.</li>
          </ul>
          <p className="mb-6 italic text-muted-foreground">
            This material is <strong>permanently public</strong> to enable independent verification and recomputation.
          </p>

          <h4 className="text-lg font-semibold mb-2 mt-4">B) Service & Profile Data (Optional / Operational)</h4>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>Wallet/DID linkages</strong> you initiate.</li>
            <li><strong>Profile fields</strong> you provide (name, avatar, city, bio) and visibility settings.</li>
            <li><strong>Telemetry</strong> (non-sensitive): basic device/browser data, coarse IP-derived location, performance metrics, aggregate analytics.</li>
            <li><strong>Support communications</strong>.</li>
          </ul>
          <p className="mb-6">We <strong>do not</strong> collect or store endorsement salts or private keys.</p>

          <h3 className="text-xl font-semibold mb-3">3. Why We Process Data (Purposes & Legal Bases)</h3>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>Provide the Service</strong> (publish endorsements, run epochs, serve proofs).</li>
            <li><strong>Integrity & security</strong> (detect manipulation, spam, exploit attempts).</li>
            <li><strong>Research & improvement</strong> (calibration, aggregate analytics).</li>
            <li><strong>Compliance</strong> (respond to lawful requests, enforce terms).</li>
          </ul>
          <p className="mb-6">
            Legal bases (where applicable): <strong>contract</strong>, <strong>legitimate interests</strong> (security, transparency), and <strong>consent</strong> (optional profiles, cookies where required).
          </p>

          <h3 className="text-xl font-semibold mb-3">4. Data Sharing</h3>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>Public artifacts</strong> are shared globally by design.</li>
            <li><strong>Vendors</strong> (hosting, storage, analytics) under contracts and security controls.</li>
            <li><strong>Auditors</strong> (if appointed) may receive encrypted graph material for recomputation.</li>
            <li><strong>Legal</strong>: where required by law.</li>
          </ul>
          <p className="mb-6">We do <strong>not</strong> sell personal data.</p>

          <h3 className="text-xl font-semibold mb-3">5. Retention & Immutability</h3>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Public endorsements, transparency log entries, and epoch bundles are <strong>append-only</strong> and <strong>retained indefinitely</strong> for verifiability.</li>
            <li>Optional profiles and operational logs are retained for as long as needed for the purposes above, then deleted or de-identified.</li>
            <li><strong>Revocations</strong> add tombstones; they do not remove historical entries.</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">6. Your Choices & Rights</h3>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>Do not endorse</strong> if you do not want a permanent public record of your VOUCH.</li>
            <li><strong>Profiles:</strong> you can add/edit/delete optional profile fields at any time.</li>
            <li><strong>Wallets/DIDs:</strong> you can unlink or relink.</li>
            <li><strong>Access & portability:</strong> request a copy of your profile data and links we store.</li>
            <li><strong>Deletion:</strong> we can delete <strong>profile</strong> and <strong>operational</strong> data, but <strong>not</strong> public endorsements or log artifacts needed for verifiability.</li>
            <li><strong>Objection/Restriction:</strong> you may object to processing of optional analytics.</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">7. International Transfers</h3>
          <p className="mb-6">
            We may process data globally. Where required, we use appropriate safeguards (e.g., SCCs, DPA terms) with vendors.
          </p>

          <h3 className="text-xl font-semibold mb-3">8. Security</h3>
          <p className="mb-6">
            We employ industry-standard safeguards: HTTPS, content-addressed artifacts, signed STHs, key rotation, access controls, and monitoring. No system is perfect—use hardware wallets and good opsec.
          </p>

          <h3 className="text-xl font-semibold mb-3">9. Cookies & Analytics</h3>
          <p className="mb-6">
            We use minimal cookies/SDKs necessary to operate and measure the Service. Where required, we show a consent banner and honor opt-outs.
          </p>

          <h3 className="text-xl font-semibold mb-3">10. Children</h3>
          <p className="mb-6">
            The Service is not directed to children under 16 (or the age required by your jurisdiction). Do not use the Service if you are under the applicable age.
          </p>

          <h3 className="text-xl font-semibold mb-3">11. Third-Party Links</h3>
          <p className="mb-6">
            External sites (e.g., explorers, GitHub, EAS) have their own policies; we are not responsible for their practices.
          </p>

          <h3 className="text-xl font-semibold mb-3">12. Changes</h3>
          <p className="mb-6">
            We may update this Policy; we will post the new effective date and, for material changes, provide reasonable notice.
          </p>

          <h3 className="text-xl font-semibold mb-3">13. Contact</h3>
          <p className="mb-6">
            For privacy inquiries, please contact us via our GitHub repository.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 border-b pb-2">Security & Responsible Disclosure</h2>
          
          <p className="mb-4">If you believe you've found a vulnerability:</p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Email us via our GitHub repository with details and reproduction steps.</li>
            <li>Do not publicly disclose until we acknowledge and fix or after 30 days.</li>
            <li>In-scope: signature verification, epoch bundle integrity, log consistency, recomputation mismatches.</li>
            <li>We may offer thanks or a bounty at our discretion.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
