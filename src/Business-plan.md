# ComplAI - QA/QC Platform Documentation

## 1. Problem Identification

### Introduction

In the fast-paced world of industrial and construction projects, quality assurance is critical. However, the tools and processes used to manage it are stuck in the past. Despite advancements in digital project delivery and automation, QA/QC is still dominated by paper-based forms, scattered documents, and time-consuming manual tasks. The result is a system that's slow, error-prone, and increasingly out of step with the demands of modern project delivery.

ComplAI was envisioned from firsthand experience with these challenges. This section outlines the key issues facing QA/QC teams today—issues that create bottlenecks, compromise compliance, and frustrate even the most experienced professionals. By clearly understanding these pain points, we can lay the foundation for a smarter, faster, and more reliable solution.

### 1.1. Inefficiency & Repetition

Current QA/QC workflows are heavily reliant on manual tasks. Creating ITRs from scratch, filling out checklists by hand, scanning paper documents, and chasing signatures across teams. These processes consume valuable time, especially on large-scale projects where thousands of items require documentation. This manual workload not only slows down project momentum but also increases administrative burden, taking skilled workers away from higher-value tasks.

In addition to this documentation is typically spread across a patchwork of systems including file servers, emails, PDFs, Excel spreadsheets, and paper folders. This fragmentation makes it difficult to keep track of what's current, what's been signed off, and where specific documents are located. As a result, critical information is often lost, duplicated, or out of sync with the latest site conditions or drawings, creating confusion and rework during inspections or handovers.

### 1.2. Compliance Risks & Human Error

In the absence of automation, QA processes are prone to mistakes. Incorrect test values, missed fields, outdated document references, or use of uncalibrated tools. Compliance with regulatory standards and project specifications depends on human vigilance, which can vary across teams and fatigue over time. These errors can lead to failed audits, costly rework, or even compromised safety, especially when they go unnoticed until late in the project lifecycle.

With no real-time validation, many QA/QC entries are accepted without proper cross-checking. Values outside tolerance ranges, incorrect torque settings, or missing documentation often slip through, especially under pressure. This makes it harder to catch problems early and increases the risk of non-compliance when it's too late to fix them efficiently.

### 1.3. Poor Visibility & Disconnected Teams

Project leaders often lack real-time visibility into QA/QC progress. Without centralised tracking or live dashboards, it's difficult to gauge what's complete, what's pending, and what's holding up handover. This lack of insight leads to delayed decision-making, misaligned expectations between teams, and rushed last-minute efforts to meet deadlines. It also leaves stakeholders, such as clients or certifiers, in the dark until final documentation is compiled, often too late to fix underlying issues efficiently.

QA/QC success depends on seamless coordination between trades, engineers, supervisors, and clients, but current systems don't support that. Without shared access to documents, role-based permissions, or version tracking, collaboration is slow and often leads to miscommunication. Redline markups, drawing revisions, and punch list closures lack traceability, making it difficult to verify who changed what and when. This creates accountability gaps and undermines confidence in the quality control process.

## 2. Current Industry Solutions

### Introduction

A variety of platforms and software solutions currently exist to support QA/QC in construction and industrial projects. Many of these tools offer valuable functionality in areas such as form digitisation, defect tracking, and document control. However, when it comes to the specific needs of high-compliance environments such as electrical infrastructure, mining, and large-scale industrial builds these platforms can often fall short.

To better understand how the current market addresses these challenges, I'll examine a selection of the most commonly used QA/QC and construction management platforms. This includes both general-purpose solutions and industry-focused tools, evaluating their strengths, limitations, and suitability for projects that demand precision, traceability, and automation. The goal is to identify the gaps these platforms leave behind.

### 2.1 QA/QC Management Platforms

#### CONQA

CONQA is a cloud-based QA platform designed for the construction industry, helping teams manage ITPs, checklists, and inspections digitally. It replaces paper-based QA with mobile-friendly tools for completing forms, uploading photos, and tracking compliance in real time. Commonly used in commercial and civil projects, CONQA helps standardise QA workflows and improve project visibility.

**Strengths:**
- Tailored for real-world site workflows, especially for structural, civil, and finishing trades
- Replaces paper-based QA with structured digital forms that are easy to complete on-site
- Optimised for use in the field, enabling workers to record inspections, attach photos, and track progress on tablets or phones

**Weaknesses:**
- All QA/QC data is entered manually—there is no AI or smart validation to catch incorrect values or flag anomalies
- Lacks the depth needed for electrical, instrumentation, or mechanical completions at an industrial scale
- The platform focuses on digitization rather than automation—ITRs and forms must still be created and maintained manually

#### Novade

Novade is a mobile-first construction management platform designed to streamline quality control, safety, and site operations. It enables teams to digitize inspections, manage defect lists, assign tasks, and track progress through real-time dashboards. Suitable for large-scale construction and infrastructure projects, Novade helps standardize workflows and improve on-site accountability through mobile access and cloud-based reporting.

**Strengths:**
- Covers quality, safety, maintenance, and progress tracking in a single platform
- Allows teams to create and manage their own inspection checklists and workflows
- Built for use in the field with offline functionality and mobile-first design
- Includes tools to assign, monitor, and close out non-conformances efficiently

**Weaknesses:**
- Designed for general site operations, so it lacks depth in testing, commissioning, and detailed QA workflows
- Does not support intelligent validation, predictive insights, or auto-generated documentation
- Cannot link ITRs or inspections to specific components or drawings for visual traceability

#### Ex Online

EX Online is a specialized QA/QC software platform focused on hazardous area compliance, particularly for electrical equipment installed in potentially explosive atmospheres (e.g. petrochemical, mining, and industrial facilities). It digitises and centralises the management of EEHA inspections, compliance records, inspection schedules, and remedial actions, helping teams meet strict regulatory requirements under AS/NZS 60079 standards.

**Strengths:**
- Purpose-built for EEHA inspections, offering deep functionality specific to electrical compliance in explosive zones
- Links inspection records directly to equipment details (e.g. Ex enclosures, cabling, lighting, etc.)
- Tracks periodic inspections, equipment records, and rectification tasks with historical traceability

**Weaknesses:**
- Highly specialised, making it less suitable for general QA/QC tasks or broader project documentation
- Lacks visual tools to markup drawings or link inspections spatially to site layouts
- Inspection forms and assessments are manually populated with no intelligent input validation or prediction

### 2.2 Drawing & Document Tools

#### Bluebeam Revu

Bluebeam Revu is a PDF-based markup and collaboration tool widely used in the construction and engineering industries. It allows users to view, edit, and annotate drawings, add comments, measurements, and redlines, and collaborate in real time through its studio platform. Known for its precision and flexibility, Bluebeam helps teams streamline document review processes and maintain control over drawing revisions and project communication.

**Strengths:**
- Offers precise drawing and markup tools tailored for construction workflows (e.g. clouding, measurements, callouts)
- Studio feature allows multiple users to review and comment on documents simultaneously
- Tracks changes and comments across drawing revisions, helping manage updates clearly

**Weaknesses:**
- Primarily a PDF markup tool, not a dedicated QA/QC platform—lacks structured workflows for inspections, ITPs, or compliance tracking
- Full functionality is only available on Windows; mobile and tablet use is restricted
- All markups, comments, and updates are done manually—no automation, smart form generation, or AI support

### 2.3 Project & Construction Management Software

#### Procore

Procore is a widely adopted construction management platform that centralises project documentation, communication, and workflows. It offers tools for project scheduling, drawing management, RFIs, submittals, and quality control, all within a cloud-based environment. Designed to improve coordination across contractors, consultants, and clients, Procore is used on commercial, civil, and infrastructure projects of varying sizes to streamline operations and increase project visibility.

**Strengths:**
- Offers an all-in-one platform for drawings, RFIs, submittals, scheduling, and communication
- Includes modules for inspections, punch lists, and incident tracking to support QA/QC workflows
- Centralised cloud-based storage with version control, ensuring teams work off the latest information
- Compatible with a wide range of third-party tools, including financial and design software

**Weaknesses:**
- While it includes quality tools, it lacks depth for managing complex test records, ITRs, and commissioning workflows
- All inspections and checklists are manually completed—no intelligent validation or auto-generated test forms
- Enterprise-level pricing can be a barrier for smaller subcontractors or companies seeking a QA-specific tool

#### Oracle Aconex

Oracle Aconex is a cloud-based construction management platform known for its robust document control and project collaboration capabilities. Designed for large-scale infrastructure and capital projects, Aconex facilitates communication between contractors, consultants, and clients by managing drawings, RFIs, submittals, and approvals in a highly structured environment. It's widely used for projects that require strict compliance, audit trails, and complex multi-party coordination.

**Strengths:**
- Built for large, multi-stakeholder projects with strict control over drawing versions, submittals, and correspondence
- All project interactions are logged and traceable, supporting compliance and accountability
- Custom approval workflows for documents, RFIs, and other communications help streamline project governance
- Trusted on large infrastructure, energy, and government-funded builds

**Weaknesses:**
- While strong in document control, it lacks built-in features for ITR management, test tracking, or QA field workflows
- The system is designed for large, structured teams and can be overwhelming for smaller or less technical users
- Mobile use is possible, but the platform is better suited for back-office administration than on-site QA tasks
- Requires training and administrative setup to unlock full functionality, which can slow onboarding

## 3. The ComplAI Solution

### Introduction

In today's fast-paced industrial and construction environments, outdated QA/QC processes slow down progress, increase costs, and introduce avoidable risks. Paper-based inspections, manual data entry, and fragmented documentation lead to inefficiencies that compromise quality and compliance. By combining smart automation, real-time data validation, and intuitive workflows, ComplAI eliminates bottlenecks, enhances accuracy, and ensures seamless collaboration across all project stakeholders. From initial documentation to final project handover, ComplAI is the future of QA/QC made simple, efficient, and intelligent. The following subsections outline the platform's core features and demonstrate how they address existing pain points while delivering unique value to users.

### 3.1. Automation & Efficiency

ComplAI leverages smart automation to eliminate repetitive tasks, ensuring that document creation, reporting, and compliance tracking are streamlined, accurate, and seamlessly integrated into existing workflows. By reducing administrative burden and minimising human error, ComplAI allows teams to focus on the tasks that really matter, improving overall project efficiency and ensuring quality standards are met from start to finish.

- **Automated ITR Generation:** Generating ITRs from designer-supplied documentation is a labour-intensive task. With a few setup steps, ITRs for cables and apparatus can be automatically created, pulling in relevant details like cable numbers, types, locations, and drawing references.

- **ITR Tracker:** Automatically generates an ITR tracker displaying the completion status of each item, with interactive percentage-based progress graphs segmented by system area, accessible in real time.

- **Link ITRs to Drawings:** Highlights relevant sections of drawings to show exactly which part of the design the ITR references, allowing users to quickly locate critical information. This feature also works in reverse, enabling users to click on a specific part of the drawing to instantly bring up the relevant test results and associated ITRs.

- **Construction Progress Trackers:** Tracks progress across different trades and professions, highlighting key areas and milestones to provide a clear overview of project advancement.

- **AI-Assisted Equipment & Documentation Segregation:** Helps organize physical equipment and their related documentation by intelligently grouping them based on system, location, and project requirements, reducing manual effort in sorting and tracking.

- **Automatic Mechanical Completion Certificates:** Uses grouped data from the documentation segregation process to automatically generate Mechanical Completion Certificates, ensuring all relevant documents are compiled and ready for handover.

- **Automated Progress Reports:** Sends daily or weekly progress reports automatically at a scheduled time, ensuring interested parties have up-to-date information before team meetings and reviews.

- **Smart Completion System:** Suggests correct entries for ITRs based on previous inputs, reducing repetitive data entry and speeding up completion for similar items.

- **Photo-Based Data Entry:** Captures and extracts information from photos of dockets for automatic delivery acknowledgment and from instrument labels to auto-fill required details, reducing manual data entry.

- **Automatic Title Page Generation:** Creates title pages with company-specific design templates, ensuring consistency and streamlining the MDR completion process.

### 3.2. Accuracy & Compliance

Maintaining strict quality and regulatory standards in industrial and construction projects requires precise documentation, thorough testing, and full traceability. Errors, missing data, and non-compliant results can lead to costly delays, rework, or even safety risks. By integrating intelligent validation, real-time monitoring, and structured compliance tracking, processes become more reliable and transparent. The following features ensure that all work meets industry standards while minimising the risk of human error.

- **Intelligent Document & ITR Validation:** Automatically checks for inconsistencies in reporting and flags incorrect or non-compliant values in real time, reducing the risk of missing information and preventing errors before submission.

- **Dynamic ITR Adjustments:** Automatically updates required tests and result fields based on the specific characteristics of the equipment being tested (e.g., with cable type, the amount of cores, tests voltages and glanding techniques).

- **Integrated Punch List Management:** When a punch list item is added to an ITR, a dropdown section appears for relevant details. Once filled out, it automatically populates a separate punch list document. When the punch list is completed, the register updates to reflect completion, and a completion note is automatically added to the corresponding ITR.

- **Mandatory Photo Attachments for Punch List Clearance:** Requires photos to be attached when resolving punch list items, ensuring traceability and providing visual proof of completion.

- **Unified Drawing Markups:** Maintains a single master set of project drawings with red and green lines added as toggleable filters, allowing users to view updates and as-built changes without duplicating files. Each markup logs the user, date, and change details with a customisable stamp, ensuring full traceability throughout the project lifecycle.

- **Construction Symbol Library:** Allows users to choose from a set of pre-made, construction-specific PDF symbols—such as different instrumentation, terminations, and control apparatus—and place them directly onto drawings for clear, consistent markups.

- **Weekly Documentation Health Scan:** Automatically detects missing or incorrect documentation, ensuring compliance and minimizing rework by proactively identifying issues before they impact progress.

- **Equipment Calibration Certificate Integration:** Automatically logs and tracks calibration certificates for test equipment, inputs relevant details into ITRs, and provides reminders for upcoming calibration due dates to ensure compliance and prevent project delays.

- **Automated Drawing Compliance Check:** Compares project drawings against industry standards to identify design clashes and compliance issues before construction begins, reducing errors and rework.

- **Aided ITP Generation:** Generates Inspection Test Plans (ITPs) based on project scope and requirements before work commences, ensuring all necessary inspections and tests are structured, documented, and ready for execution.

- **Project Stage Prompts:** Provides reminders at key project phases, highlighting necessary tools, safety equipment, and best strategies to minimise delays.

- **AI-Assisted RFI Section:** Allows users to ask technical questions based on project documents and receive AI-generated responses for quick guidance.

### 3.3. Collaboration & Visibility

Effective QA/QC relies on clear communication, seamless access to information, and real-time progress tracking. Disconnected systems, restricted data access, and inefficient reporting can lead to delays and misalignment between teams. By centralizing project data, enabling role-based access, and providing real-time insights, processes become more transparent, collaborative, and efficient. The following features enhance coordination across all project stakeholders, ensuring that work is completed accurately and on schedule.

- **Role-Based Access & User Authentication:** Ensures users can only access and edit relevant sections based on their credentials, qualifications, and role-specific permissions, ensuring engineers are able to edit documents while technicians are limited to filling them out.

- **Visual Access Hierarchy:** Displays a family-tree-style diagram showing user access levels across the project for a quick reference.

- **Expiry Reminders for Certifications:** Technicians set up profiles listing their credentials and certifications, with automatic alerts for expiring licenses, tickets, and qualifications such as electrical licenses, confined space, and CPR certifications.

- **Calibrated Tools Register:** Maintains a log of testing equipment, tracking calibration status and sending alerts when calibration is nearing expiration to prevent delays and ensure compliance.

- **Completion Status Tracking:** Provides real-time progress updates, segmented into sections for a clear breakdown of completed work and remaining tasks.

- **AI-Assisted Project Sectioning:** Suggests optimal ways to divide a project into QA areas based on scope and workflow.

- **Interactive MDR System:** Upon project completion, users can click on items in the MDR to instantly access all related test results, eliminating the need to manually search through thousands of pages of documentation.

- **Workpack Generation:** Automatically compiles relevant documentation into structured workpacks, providing technicians with all necessary information to complete tasks efficiently and correctly the first time.

- **Suggested Punch Lists:** Identifies similar punch list items to prevent duplication and improve efficiency.

- **Meeting Scribe & Action Plan Generator:** Captures meeting discussions in real time, summarises key points, and automatically generates actionable steps, ensuring relevant tasks are assigned and sent to the right people.

## 4. Monetisation

### Introduction

To ensure ComplAI is accessible and practical across a wide range of project types, the platform is offered under a simple three-tier pricing model. This structure is designed to suit everything from small-scale jobs with limited QA requirements to large enterprise-level projects with multiple users and complex documentation needs.

Each tier provides access to a different set of features based on project size, team needs, and the level of automation required. Pricing is transparent, with no need for manual quoting, and annual plans include an optional training session to assist with onboarding and adoption.

### 4.1 Pricing Model

| Plan | Monthly (Per User) | Annual (Per User) | Flat Rate (Training session Included) | Best For |
|------|-------------------|-------------------|---------------------------------------|----------|
| Core | $69 | $600 | – | Small teams, contractors, or simple QA scopes |
| Project | $149 | $1,200 | $15,000/year (up to 50 users) | Full QA/QC workflows for mid-size construction teams |
| Enterprise | $249 | $2,000 | $25,000/year (unlimited users) | Large-scale projects, infrastructure teams, multi-trade enterprise |

### 4.2 Included in Each Tier

#### Core

The Core plan is designed for small teams or individual contractors who need access to digital QA forms and basic ITR management. It's suited to low-volume work or early-stage adoption, offering essential tools without advanced automation.

- Auto-generated ITRs and tracking from cable schedules and ISO drawings
- ITRs linked directly to drawings for fast reference and verification
- Punch list items sync automatically from ITRs to the central register
- Role-based access control with tiered user permissions and hierarchy
- Real-time dashboards for progress tracking and system completion
- Registers and alerts for equipment calibration and licence expiry
- Web and tablet access, including offline functionality for field use

#### Project

The Project plan is built for active job sites requiring full QA workflows, drawing integration, and system tracking. It includes smart tools to streamline document handling, punch lists, and progress reporting, with optional AI features available as needed.

**Includes everything in Core, plus:**

- Unified red/green markups on a single master drawing set for clarity and traceability
- Scheduled progress reports sent automatically to stakeholders at set intervals
- Smart ITR completion suggestions based on previous inputs and item type
- PDF symbol library for accurate, consistent markups using trade-specific icons
- Assisted ITP and MCC generation using project data and drawing-based grouping
- Mandatory photo attachments for punch list closure and verification
- Meeting summaries and action plans generated automatically from discussion notes

#### Enterprise

The Enterprise plan is intended for large projects or organisations managing multiple teams, systems, or high-volume compliance requirements. It includes full automation, AI tools, unlimited users, and advanced features for handover, documentation traceability, and team oversight.

**Includes everything in Project, plus:**

- AI test validation that flags incorrect or non-compliant entries in real time
- AI-assisted project sectioning and RFI support based on document context
- Photo-based data entry (OCR) to auto-fill forms from dockets and instrument labels
- Weekly health scans to detect missing or inconsistent documentation
- Drawing compliance checks to identify clashes against industry standards
- Interactive MDR access for instant retrieval of test results from handover records

### 4.3 Feature Summary

| Feature | Core | Project | Enterprise |
|---------|------|---------|------------|
| Automatic ITR Generation & Tracking | ✅ | ✅ | ✅ |
| Drawing-Linked ITRs | ✅ | ✅ | ✅ |
| Punch List Tracking & Auto ITR Updates | ✅ | ✅ | ✅ |
| Role-Based Access & User Management | ✅ | ✅ | ✅ |
| Progress & Completion Dashboards | ✅ | ✅ | ✅ |
| Calibration & Licencing Registers & Alerts | ✅ | ✅ | ✅ |
| Unified Drawing Markups (Red/Green) | – | ✅ | ✅ |
| Scheduled Progress Reports | – | ✅ | ✅ |
| Smart ITR Completion Suggestions | – | ✅ | ✅ |
| PDF Editor Symbol Library | – | ✅ | ✅ |
| Aided ITP & MCC Generation | – | ✅ | ✅ |
| Photo Attachments for Punchlist | – | ✅ | ✅ |
| Meeting Summaries & Action Generator | – | ✅ | ✅ |
| AI Test Validation & Compliance Checks | – | – | ✅ |
| AI-Assisted Project Sectioning & RFI Tool | – | – | ✅ |
| Photo-Based Data Entry (OCR) | – | – | ✅ |
| Weekly Documentation Health Scan | – | – | ✅ |
| Drawing Compliance Check | – | – | ✅ |
| Interactive MDR Access | – | – | ✅ |

### 4.4 Training & Support

- Annual subscribers (Project & Enterprise) receive a free onboarding session (1:1 or team)
- Full access to video tutorials, help guides, and live chat support
- Enterprise accounts receive priority assistance and technical setup guidance

### 4.5 Pricing model reasoning

- Small contractors aren't priced out (Core plan)
- Mid-size teams can grow as projects scale (Project)
- Larger clients can access everything without per-user limits (Enterprise)

## 5. Minimum Viable Product (MVP)

### Introduction

To validate the core concept of ComplAI and gather early user feedback, a Minimum Viable Product (MVP) will be released with a focused set of essential features. The goal of the MVP is to demonstrate the value of a digital QA/QC system tailored to industrial and infrastructure projects, while keeping the build simple enough to launch quickly and test for usability, demand, and technical reliability.

The MVP will be made available for free during the trial phase. This approach allows for real-world testing without the pressure of immediate monetisation, helping identify bugs, gather feature requests, and better understand user behaviour in live environments.

While many of ComplAI's planned features involve advanced automation and AI assistance, the MVP will focus on the fundamental tools required to digitise and streamline QA processes at a basic level.

### 5.1 MVP Feature Set

- **ITP Creation and Linking:** Allows users to create Inspection Test Plans from templates or from scratch based on project scope. ITPs are linked to their associated ITRs and automatically update as tests are completed, providing a clear overview of progress and ensuring no inspections are missed.

- **Automatic ITR Generation:** Users can upload cable schedules to automatically generate ITRs, significantly reducing one of the most time-consuming and error-prone tasks in QA. ITRs can be formatted to match project needs and saved as company-specific templates to align with existing documentation standards.

- **Logic-Based ITR Prompts:** When specific equipment is added during setup, the system suggests all related ITRs typically required for that item—helping ensure a complete and consistent QA process without the need to manually select every test.

- **ITR Tracking Dashboard:** Displays a simple status overview (e.g. Not Started, In Progress, Complete, Signed Off), giving teams clear visibility into testing progress across systems and subsystems.

- **Punch List Logging:** Allows for manual punch list entries—either standalone or within ITRs—to track and resolve issues before handover. Punch list items are categorised by severity and, once completed, automatically update the associated ITR for future reference.

- **User Login and Role-Based Access:** Controls who can view, fill, or edit documents based on user role. Technicians are limited to filling out forms, while engineers and supervisors have access to editing, review, and system-level controls.

- **Calibration & Licensing Register:** Maintains a log of test equipment and personnel certifications with automated expiry reminders, supporting compliance and reducing the risk of delays.

- **Progress Summary by System or Area:** Offers a clear breakdown of completed and outstanding work segmented by system or physical area, helping with planning, reporting, and prioritisation.

- **Web and Tablet Access with Offline Mode:** Supports on-site work without internet access. Field data syncs automatically when connectivity is restored—critical for remote or infrastructure-heavy environments.

- **Simple Redline Markup Tool:** Enables users to draw directly on uploaded drawings (PDF or image) using basic annotation tools like red lines and text boxes. This digital workflow replaces manual pen-and-paper markups and improves clarity around field changes.

### 5.2 MVP Goals & Success Criteria

The goal of the MVP is to test real-world usability, identify pain points, and measure interest in a digital-first QA/QC tool for infrastructure projects. Success will be defined by user engagement, feature adoption, and qualitative feedback from early testers.

### 5.3 MVP Feedback Loop

Feedback will be collected through a built-in feedback button and a direct support email. A small group of pilot users will also be invited to test the platform and provide structured feedback to help identify bugs, usability issues, and improvement opportunities.

## 6. UI/UX Workflow

### Introduction

Every QA process starts with good structure, and ComplAI is designed to make project setup as straightforward and intelligent as possible. Rather than dropping users into a blank dashboard, the platform will launch a guided setup wizard once a new project is created. This onboarding flow walks users through all the essential steps to prepare a QA-ready project. From defining teams and disciplines, to uploading documentation, customising ITPs, and generating trackers.

The setup process is modular and customisable, with the ability to skip sections and come back to them later. This flexibility ensures it works in real-world environments, where not all information is available upfront. The system is designed to standardise QA across projects while also accommodating the specific requirements of each job.

### 6.1 Onboarding

1. **Sign Up:** Users create an account by entering their name, email, company name, and password, and selecting a role (Admin, Engineer, or Technician).

2. **Access Admin Console:** Upon first login, Admin users are welcomed with a clean dashboard offering options to start a new project, invite users, and begin the guided setup process.

3. **Upload Company Branding:** Admins can upload a company logo and select brand colours to be used on ITRs, ITPs, trackers, and handover documentation.

4. **Set Up User Roles:** Users can be invited via email and assigned roles such as Technician (form entry), Engineer (editor), or Admin (full access and setup).

5. **Quick Walkthrough or Skip Option:** A short tutorial is available to highlight key features, with the ability to skip and jump straight into project creation.

### 6.2 Create New Project

1. **Start New Project:** Admin selects "New Project" from the dashboard and enters basic project details such as project name, client, location, and start date.

2. **Define Disciplines:** User selects which disciplines are relevant to the project (e.g., Electrical, SMP, Civil, Instrumentation), enabling discipline-specific QA flows in later steps.

3. **Set Up Staffing Profiles:** Users create staff profiles and assign individuals to each discipline, including their role (Technician, Engineer, Supervisor) and qualifications if known.

4. **Build Hierarchy Tree:** A visual project hierarchy is created to reflect teams, reporting structures, and QA responsibility layers. This helps define document ownership and approval chains.

5. **Save Project Profile:** Once the basic setup is complete, the project is saved, and users are guided to the next step—document upload.

### 6.3 Upload Documentation

1. **Upload Standards and Specifications:** Users upload any relevant QA standards, testing specifications, or project requirements provided by the client or governing body.

2. **Upload Design Documentation:** Users upload documentation from the designer or consultant, such as equipment schedules, single line diagrams, cable lists, or scope documents.

3. **Assign to Disciplines:** Uploaded documents can be tagged by discipline (e.g., Electrical, Civil), allowing for better filtering and structured access in later setup stages.

4. **Define Document Types:** Users can categorise files (e.g., Drawings, SLDs, Datasheets, Specs) to support future logic-based ITR generation and linking.

5. **Document Version Control:** The system stores each version of a file, allowing users to replace or redline drawings while retaining original versions for traceability.

### 6.4 Start up Guide

1. **Guided QA Setup:** Users are taken through a structured setup process, step-by-step by discipline (e.g., Electrical, Civil, SMP), to identify which QA activities are required for the project.

2. **Equipment Identification and Segregation:** Users define what equipment is on the project and how it should be grouped by system, location, or commissioning area. Laying the groundwork for ITP creation.

3. **Skipped Step Tracker:** Any steps that are skipped are logged and displayed in a "Setup Incomplete" section, visible on the main dashboard with notifications until they are resolved.

4. **Discipline-Specific Logic:** Each discipline has tailored input options, such as cable testing for Electrical or weld mapping for SMP, ensuring relevant QA requirements are captured.

### 6.5 ITP Guide

1. **ITP Template Selection:** Users can select from a library of pre-configured ITP templates based on discipline or start from a blank ITP if preferred.

2. **Customisation for Project Requirements:** Each ITP can be modified to suit specific project acceptance criteria, including hold points, witness requirements, and references to standards.

3. **Auto-Link to ITRs:** As ITRs are generated in later steps, they are automatically linked to the appropriate ITP, creating a structured QA chain from planning to execution.

4. **Reuse Across Projects:** Customised ITPs can be saved to a company template library for easy reuse and standardisation across future projects.

5. **Sign-Off Workflow Setup:** Users define the approval process for each ITP, including required sign-off roles (e.g., Technician, Engineer, Client Rep), ensuring compliance with project-specific workflows.

### 6.6 ITR Guide & Grouping

1. **ITR Source Documents:** ITRs are automatically generated by extracting relevant data from cable schedules, equipment registers, and ISO drawings uploaded during earlier setup.

2. **Naming Conventions:** Users can assign ITR names based on existing project or client naming standards to ensure consistency across documentation.

3. **Standard ITR Templates:** ITRs are based on editable templates that can be adjusted to meet specific project requirements. If a template is modified after ITRs have been created, those ITRs are automatically updated and flagged for re-signing if they've already been completed or partially signed off. Updated templates can also be saved for future use.

4. **Logical Grouping:** ITRs are grouped into handover areas or subsystems, aligning with how the project will be walked down and signed off.

5. **Manual Adjustments:** While ITRs are auto-populated, users can edit, duplicate, or remove entries as needed to reflect real-world site conditions.

6. **Link to ITPs:** Each ITR is automatically linked to the appropriate ITP for traceability and progress tracking.

### 6.7 Automatically Create Trackers

1. **Tracker Generation:** Once ITRs and ITPs are in place, the system automatically generates live trackers for each discipline, displaying the progress of all QA activities.

2. **Flexible Segregation:** Trackers can be filtered and broken down by discipline, subsystem, physical area, or handover boundary—allowing users to tailor the view to match how the site is structured.

3. **Visual Progress Indicators:** Progress is displayed using clear, easy-to-read graphs and percentage bars, enabling quick identification of bottlenecks or outstanding tasks at a glance.

4. **Unlimited Custom Views:** Users can create multiple tracker views to suit different stakeholders or reporting needs, including high-level overviews or detailed breakdowns by equipment or QA stage.

5. **Live Sync with ITRs:** Tracker data is updated in real time as ITRs are filled out, signed off, or modified, ensuring reports always reflect the current project state.

### 6.8 MCC Allocations

1. **MCC Generation:** Once ITRs and trackers are in place, the system compiles Mechanical Completion Certificates (MCCs) by grouping all related equipment, tests, and documents within a defined area or subsystem.

2. **Area-Based Compilation:** MCCs are built around physical areas, rooms, or systems to reflect how walkdowns and handovers are typically conducted on-site.

3. **ITR and Equipment Linking:** Each MCC includes links to the relevant ITRs, equipment details, and punch list items, providing a complete view of readiness for sign-off.

4. **MCC Tracker:** A dedicated MCC tracker is generated alongside discipline trackers, showing the status of each area's readiness for walkdown, punch resolution, and client handover.

5. **Final Handover Package Integration:** Completed MCCs feed directly into the final MDR (Manufacturer's Data Report), compiling all relevant ITRs, punch lists, and supporting documentation for client handover.

### 6.9 Miscellaneous

The following modules are accessible at any time via the sidebar navigation. While not part of the initial project setup flow, they support critical QA-related activities throughout the project lifecycle.

1. **Factory Acceptance Tests (FATs):** This section allows users to log, review, and attach documentation for Factory Acceptance Tests. FAT records can be linked to specific equipment or ITRs for traceability.

2. **Delivery Acknowledgements:** Provides a structured area to capture delivery dockets, photos, and sign-offs for received materials or equipment, helping maintain traceability from delivery through to installation.

3. **Procurement Trackers:** Enables teams to track the procurement status of major equipment and long-lead items, ensuring alignment with QA and construction timelines.

4. **Redline Drawing Register:** Serves as a central hub for managing redlined drawings, including version control, user stamping, and drawing overlays linked to relevant systems or ITRs.

5. **Non-Conformance Reports (NCRs):** A formal module for logging and tracking NCRs, including issue descriptions, corrective actions, status updates, and associated QA documentation.

### 6.10 Exporting and Documentation Control Integration

1. **Flexible Export Options:** Users can export ITPs, ITRs, trackers, MCCs, punch lists, and redline registers into structured file formats such as PDF, Excel, or ZIP folders for external use.

2. **Metadata-Driven Organisation:** Exported files use project metadata (e.g. system name, area code, document number) to automatically apply correct naming conventions and folder structures, reducing manual formatting.

3. **External Document Control Compatibility:** Export formats are designed to integrate with common document control systems used by contractors, clients, and asset owners who maintain their own internal workflows.

4. **Company-Wide Adoption Goal:** While external export is supported, the long-term goal is to enable companies to fully manage QA documentation within ComplAI, including handover documentation and version control.

5. **Configurable Export Settings:** Users can define preferred file types, naming formats, and export rules to meet client-specific or project-specific document control requirements.

## 7. Integration & API Strategy

### Introduction

ComplAI is built to be powerful on its own, but even more valuable when connected to the systems that teams already use. Integration with communication tools, project management platforms, and specialist QA systems will enhance adoption, reduce double-handling, and position ComplAI as a collaborative part of the broader digital ecosystem. This approach also opens the door to potential partnerships, cross-platform workflows, and long-term scalability.

### Integration Method

- **Microsoft Integration:** ComplAI will support integration with Microsoft Teams and Outlook to enable real-time notifications, task reminders, and scheduled report deliveries—keeping QA progress visible and actionable within familiar tools.

- **External QA System Compatibility:** API access will allow ComplAI to exchange data with third-party platforms such as EX Online, ensuring that key functions like hazardous area compliance remain connected and synchronised across systems.

- **Strategic Integration Partnerships:** By partnering with reputable third-party QA software providers, ComplAI can complement existing systems rather than compete with them—creating opportunities for referrals, data-sharing, and industry credibility.

- **Two-Way Syncing (Long-Term Goal):** Future development may include two-way data syncing, allowing updates made in ComplAI to reflect in third-party platforms and vice versa—streamlining collaboration and reducing duplicate work.

- **Secure and Configurable API Access:** All integrations will use secure, token-based APIs with configurable permissions, allowing companies to choose what data is shared, with whom, and under what conditions.

## 8. Long-Term Vision & Industry Impact

The ultimate goal for ComplAI is to become the industry standard for QA/QC across construction and industrial projects worldwide. As more companies adopt the platform, it will shift from being a project tool to becoming a critical part of how the entire industry ensures quality, safety, and compliance.

By conducting all QA processes internally within the platform, ComplAI creates a secure environment for capturing structured, high-quality data at scale. This opens the door to training advanced AI agents that learn from real-world usage. Improving accuracy, anticipating issues, and offering proactive guidance throughout every step of the QA process.

Over time, this will allow ComplAI to not only streamline individual projects but also help lift the overall standard of the industry. With consistent, data-driven QA practices and smarter decision-making tools, teams around the world can deliver safer, more efficient, and higher-quality outcomes, together.