# BRD Generator

An AI-powered Business Requirements Document (BRD) generator built with Next.js and OpenAI's GPT-4.

## Features

- 12 modular BRD sections with AI-powered content generation
- Professional formatting and structure
- Real-time validation and completeness checking
- Step-by-step or complete document generation
- Modern, responsive UI with Tailwind CSS

## Modules

1. Cover Page & Metadata
   - Project details
   - Company information
   - Document control

2. Executive Summary
   - Business context
   - Problem statement
   - Project overview

3. Business Objectives
   - SMART goals
   - KPIs
   - Targeted improvements

4. Scope
   - In-scope features
   - Out-of-scope items
   - Boundaries and limitations

5. Stakeholder Analysis
   - Roles and responsibilities
   - Department information
   - Communication requirements

6. Functional Requirements
   - Feature specifications
   - User roles
   - Acceptance criteria

7. Non-Functional Requirements
   - Performance metrics
   - Security requirements
   - Scalability needs

8. Assumptions & Constraints
   - Technical limitations
   - Business constraints
   - Resource restrictions

9. Risk Analysis
   - Risk identification
   - Severity assessment
   - Mitigation strategies

10. Timeline & Milestones
    - Project phases
    - Deliverables
    - Status tracking

11. Appendix & Glossary
    - Technical terms
    - Reference documents
    - Supporting materials

12. Sign-off Section
    - Stakeholder approvals
    - Comments
    - Status tracking

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Start a new BRD by clicking "Generate Complete BRD" or work through sections individually
2. For each section:
   - Review the AI-generated content
   - Edit as needed
   - Move to the next section
3. Validate the complete document
4. Export or save the final BRD

## Technologies

- Next.js 14
- React 18
- TypeScript
- OpenAI GPT-4
- Tailwind CSS

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT License - see LICENSE file for details
