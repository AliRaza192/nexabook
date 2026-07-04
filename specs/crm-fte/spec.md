# spec.md — CRM FTE

## Goal

Automate customer relationship management for Pakistani SMEs: lead tracking, follow-up automation, communication logging, customer analytics, and sales pipeline management. Ensure no lead falls through the cracks and sales teams close more deals.

## User Scenarios

- When a new lead is added, then follow-up schedule is auto-created
- When a follow-up is due, then alert is sent via NexaBot
- When a customer communication occurs (call, email, meeting), then it is logged against the lead
- When a deal stage changes, then pipeline is updated and metrics recalculated
- When month-end arrives, then sales analytics are generated and available
- When a customer is inactive for 30+ days, then re-engagement alert is sent
- When a duplicate lead is detected (same email or phone), then warning is shown

## Functional Requirements

### FR-1: Lead Management
- Create leads with: name, company, phone, email, source, estimated value
- Lead stages: New, Contacted, Qualified, Proposal, Negotiation, Won, Lost
- Auto-assign lead source (website, referral, cold call, social media, walk-in)
- Track estimated deal value per lead
- Filter and search leads by stage, source, date range, value range

### FR-2: Follow-Up Automation
- Create follow-up tasks with due date, type (call/email/meeting), and notes
- Auto-remind before due date: 1 day before and 1 hour before
- Mark follow-up complete with outcome (connected, no answer, rescheduled, completed)
- Escalate overdue follow-ups (more than 24 hours past due)
- NexaBot alerts for due and overdue follow-ups

### FR-3: Communication Logging
- Log phone calls: duration, summary, outcome, next steps
- Log emails: subject, summary, key points
- Log meetings: date, attendees, agenda, minutes, action items
- Link every communication to the relevant lead or customer
- Timeline view showing all communications in chronological order

### FR-4: Sales Analytics
- Total leads by stage (pipeline snapshot)
- Conversion rate: leads won divided by total leads (by period)
- Average deal value (won deals only)
- Sales cycle length: average days from lead creation to won
- Revenue by customer (total invoiced amount)
- Top 10 customers by revenue
- Customer lifetime value (total revenue minus cost of acquisition)
- Leads by source (which sources produce most wins)

### FR-5: Sales Pipeline
- Kanban view of pipeline stages (drag-and-drop between stages)
- Pipeline value: total estimated value of all open deals
- Win rate: won deals divided by total closed deals (won plus lost)
- Revenue forecast: pipeline value multiplied by stage-probability weighting
- Pipeline by salesperson (if multi-user)

### FR-6: Customer Segmentation
- Segment by industry (configurable list)
- Segment by city/region (Pakistan cities)
- Segment by deal size (small/medium/large, configurable thresholds)
- Segment by activity level (active: transacted in 30 days, inactive: no transaction in 30+ days)
- Custom tags or labels for flexible categorization

## Edge Cases

- Lead with multiple contact persons (decision makers, influencers)
- Deal that falls through after proposal (record lost reason for analysis)
- Customer with multiple concurrent deals (track each separately)
- Follow-up rescheduling (change due date, preserve history)
- Communication log linked to multiple leads (same company, different projects)
- Duplicate lead detection (same email or phone number already exists)
- Lead converted to customer (move to customer database, preserve history)
- Won deal that gets cancelled (reverse status, do not delete)

## Out of Scope

- Email marketing campaigns (bulk email sending)
- Social media integration (posting, monitoring)
- Website chat or live chat integration
- Proposal or quotation generation (handled by invoicing module)
- Contract or agreement management
- Territory or region-based assignment rules

## Acceptance Criteria

- [ ] Lead stages track correctly through full lifecycle
- [ ] Follow-up reminders sent on time (1 day and 1 hour before due)
- [ ] Communication logged against correct lead with timestamp
- [ ] Analytics calculations are mathematically correct
- [ ] Pipeline shows accurate deal values and stage distribution
- [ ] All CRM queries filter by `orgId`
- [ ] Duplicate detection warns on same email or phone
- [ ] NexaBot alerts delivered for due and overdue follow-ups within 1 minute
- [ ] TypeScript: 0 errors
- [ ] All tests pass (`npm run test`)

## Skills

### crm-lead-management
**Description:** Creates, updates, and manages leads through the sales pipeline. Fires on lead creation, stage change, and status updates.
- Input: Lead data, stage transitions
- Output: Updated lead record, pipeline metrics
- Guard: Never delete leads (mark as Lost instead)

### crm-follow-up
**Description:** Manages follow-up scheduling, reminders, and escalation. Fires on follow-up creation, due date, and overdue detection.
- Input: Follow-up task, due date
- Output: Reminders via NexaBot, escalation alerts
- Guard: Never create follow-up without due date

### crm-analytics
**Description:** Generates sales analytics and pipeline reports. Fires on period-end or manual request.
- Input: Lead and deal data, date range
- Output: Analytics dashboard, reports
- Guard: Always filter by orgId and date range

### crm-segmentation
**Description:** Segments customers and leads by industry, location, deal size, and activity. Fires on data change or manual request.
- Input: Customer/lead attributes
- Output: Segmented lists, segment metrics
- Guard: Always allow custom segments alongside predefined ones
