import { BLOOD_GROUPS } from '../types';
import { COMPATIBLE_DONORS } from '../lib/bloodEngine';

export function ScreeningGuideView() {
  const criteriaRows = [
    {
      criterion: 'Donor Age',
      requirement: '18 to 65 years (inclusive)',
      rationale: 'Ensures physiological maturity and cardiovascular safety during whole-blood collection.',
    },
    {
      criterion: 'Body Weight',
      requirement: 'Strictly more than 45 kg',
      rationale: 'Maintains safe blood volume ratio relative to a standard 350–450 mL donation.',
    },
    {
      criterion: 'Hemoglobin Level',
      requirement: 'Above 12.5 g/dL (125 g/L)',
      rationale: 'Protects the donor from post-donation anemia and ensures adequate red-cell potency.',
    },
    {
      criterion: 'Day-of-Donation Health',
      requirement: 'Healthy, infection-free, normal temp & pulse',
      rationale: 'Prevents pathogen transmission and vasovagal reactions from acute cold, flu, or fever.',
    },
    {
      criterion: 'Interval (Male Donors)',
      requirement: 'At least 3 months (90 days) since last donation',
      rationale: 'Allows complete replenishment of red blood cells and iron stores.',
    },
    {
      criterion: 'Interval (Female / Other Donors)',
      requirement: 'At least 4 months (120 days) since last donation',
      rationale: 'Provides extended recovery window for iron ferritin replenishment.',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-800 pb-5">
        <h1 className="font-display text-2xl font-bold text-slate-50">
          Clinical Screening Criteria & Blood Compatibility
        </h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Every rule enforced by BloodBridge before a donor appears in patient search results.
        </p>
      </div>

      <section className="rounded-xl border border-slate-800 bg-[#0F172A] overflow-hidden">
        <div className="border-b border-slate-800 px-5 py-4">
          <h2 className="font-display text-base font-semibold text-slate-100">
            Donor Eligibility Gates
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/60 text-xs font-semibold text-slate-400">
              <tr>
                <th className="px-5 py-3">Screening Metric</th>
                <th className="px-5 py-3">Required Threshold</th>
                <th className="px-5 py-3">Clinical Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {criteriaRows.map((row) => (
                <tr key={row.criterion} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-slate-100 whitespace-nowrap">
                    {row.criterion}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-emerald-400 tabular-nums whitespace-nowrap">
                    {row.requirement}
                  </td>
                  <td className="px-5 py-3.5 text-slate-400">{row.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-[#0F172A] overflow-hidden">
        <div className="border-b border-slate-800 px-5 py-4">
          <h2 className="font-display text-base font-semibold text-slate-100">
            Red Blood Cell Compatibility Reference
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/60 text-xs font-semibold text-slate-400">
              <tr>
                <th className="px-5 py-3">Patient Blood Group</th>
                <th className="px-5 py-3">Compatible Donor Blood Groups</th>
                <th className="px-5 py-3 text-right">Options Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {BLOOD_GROUPS.map((group) => {
                const donors = COMPATIBLE_DONORS[group];
                return (
                  <tr key={group} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-semibold text-red-400 tabular-nums">
                      {group}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-200">
                      {donors.join(' · ')}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs text-slate-400 tabular-nums">
                      {donors.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
