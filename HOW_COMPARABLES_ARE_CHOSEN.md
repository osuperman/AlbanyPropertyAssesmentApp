# How Comparable Homes Are Chosen

This application uses a two-stage process.

First, it builds a visible list of the best physical matches for the subject property. Then it builds a smaller default grievance package from that list for RP-524 support.

## 1. Visible Comparable List

The visible list is meant for research and review. It shows up to 12 homes that are physically credible matches.

The app starts by filtering out homes that are clearly not comparable. Examples include:

- The same parcel as the subject
- Incompatible residential class
- Missing both assessed value and full market value
- Too far away
- Major gaps in living area, year built, beds, or baths

After that, the app gives each remaining home a comparable quality score. That score is based on:

- Residential class compatibility
- Location similarity
- Living area
- Year built
- Bedrooms
- Bathrooms
- Style family
- Full market value alignment

Only homes with enough quality remain in the visible list.

## 2. Data Confidence Check

The app also assigns a data confidence score.

This score goes down when important fields are missing or incomplete, such as:

- Living area
- Assessed value
- Full market value
- Year built
- Beds or baths
- Style normalization
- Distance calculation

This matters because a comp may look close at first glance, but weak data makes it less reliable as evidence.

## 3. Grievance Support Score

The default grievance package is not based on lower assessed value alone.

Each comp also gets a grievance support score. This score looks at normalized value evidence, including:

- Assessed value difference
- Equity ratio difference
- Assessed value per square foot difference

In plain terms, the app asks:

- Is the comp assessed lower than the subject?
- Is the comp carrying a lower effective assessment ratio?
- Is the comp assessed lower on a per-square-foot basis?

If those normalized signals do not support the subject, a lower raw assessed value by itself is not enough.

Example:

- The comp is 9% lower in assessed value
- The comp's full market value is also lower
- The equity ratio is effectively the same
- The assessed value per square foot is effectively the same

That is not strong unequal-assessment evidence. It usually means the comp is lower mostly because it is a lower-value or smaller home overall, not because it is clearly being assessed more favorably.

A lower assessed value does not automatically mean better grievance evidence if the comp is also proportionally lower in full market value or size.

## 4. Default Grievance Package

The smaller RP-524 package is built from the visible comps, but only if a home clears all three gates:

- Comparable quality score of at least 50
- Data confidence score of at least 60
- Positive grievance support score

From that pool, the app usually keeps 3 to 5 homes.

It favors stronger evidence first:

- Strong support and moderate support comps are preferred
- Weak-support comps are used only if needed to avoid an overly thin package

It also applies diversity and outlier controls:

- No more than 2 comps from the same street
- Strong comps are not excluded solely because another nearby strong comp makes a similar argument
- Moderate or weaker comps can still be skipped if a nearby comp is stronger on quality, confidence, and support
- Extreme low-value outliers can be excluded

That means two strong-support homes from the same neighborhood with near-identical characteristics may now stay together in the default package as corroborating evidence.

## 5. Why Some Visible Homes Are Not Auto-Selected

A home may still appear in the visible list but stay out of the default grievance package because:

- It is a good physical match but does not support the grievance after normalization
- It has too much missing data
- The default package already reached its 3 to 5 comp target
- The package already includes 2 comps from the same street
- For moderate or weaker comps, a stronger comp already covers the same street or neighborhood evidence
- It looks like an outlier compared with the rest of the selected package

That is intentional. The visible list is broader research context. The grievance package is narrower filing evidence.

## 6. Manual Override

Users can still include or remove comps manually.

When that happens, the app updates the following live from the current selection:

- Grievance summary
- Suggested requested assessed value
- Auto-generated narrative
- Side-by-side grievance table

## 7. How The App Names The RP-524 Complaint Reason

The app now shows the likely filing basis directly in the workflow instead of leaving the user to infer it from the notes.

In Step 2, the case-strength card shows:

- The overall strength level, such as `Strong`, `Moderate`, or `Weak`
- The likely RP-524 basis on its own line, such as `Unequal Assessment` or `Excessive Assessment`

In Step 5, the filing helper also tells the user which complaint box to check and why.

The app currently uses comparable-home evidence to recommend these grounds:

- `Unequal Assessment` when the subject carries a higher effective assessment ratio than the selected comp package
- `Excessive Assessment` when the subject's full market value still appears too high compared with the selected comp package
- `Unequal + Excessive Assessment` when both of those signals are supported
- `Manual Review Needed` when the current comp package does not clearly support either basis

The app does not automatically recommend `Unlawful Assessment` or `Misclassification` from comparable-home data alone.

Those two grounds usually require separate evidence, such as:

- A classification error
- A homestead or non-homestead allocation error
- An exemption issue
- A parcel identity, boundary, or roll-description problem

So if the app recommends unequal or excessive assessment, that recommendation is based on the selected comps and the normalized value checks. If a user believes the real issue is unlawful assessment or misclassification, they may still choose that ground manually, but they would need outside proof beyond the comparable package.

## 8. Short Version

The app does not ask only, "Which homes are assessed lower?"

It asks a stricter question:

"Which nearby homes are physically similar, have reliable data, and still support the grievance after normalized value checks?"

That is why the default grievance package is smaller than the visible list.
