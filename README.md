# SalaryApp

**SalaryApp** is a cloud-based Salary and Employee Management System designed to help businesses streamline and automate their employee-related tasks, including salary processing, EPF/ETF contributions, attendance tracking, and B-Card management.

## **Live Site:** [https://salary-mocha.vercel.app/](https://salary-mocha.vercel.app/)

## 🚀 Features

- **Employee Management:** Effortlessly add, edit, and manage employee records.
- **Salary Processing:** Automatically calculate salaries, overtime (OT), holiday pay, and generate payslips.
- **EPF/ETF Contributions:** Track and manage mandatory EPF/ETF contributions seamlessly.
- **B-Card Management:** Generate AH forms (successor to B-Card) and maintain employee records.
- **Attendance Management:** Upload and process In/Out CSV files to calculate working hours, overtime, and attendance.
- **Automated Reports:** Generate EPF/ETF reports, salary sheets, and more.
- **Multi-Company Support:** Manage multiple companies or branches under one platform.
- **Cloud-Based & Secure:** Access data anytime, anywhere, with secure authentication.
- **User-Friendly UI:** Clean and intuitive interface for easy navigation and usage.

---

## ⚙️ Technology Stack

- **Frontend:** [React](https://reactjs.org/) with [Material-UI](https://mui.com/) for a responsive, modern UI.
- **Backend:** [Next.js](https://nextjs.org/) with API routes for server-side logic.
- **Authentication:** [NextAuth.js](https://next-auth.js.org/) for secure, customizable authentication.
- **Database:** [MongoDB](https://www.mongodb.com/) for flexible, scalable data storage.
- **State Management:** React Context API and Hooks for efficient state handling.

---

## 🛠️ Getting Started

### Prerequisites

- Node.js (v17.x or later)
- npm or yarn
- MongoDB instance (local or hosted, e.g., MongoDB Atlas)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/anush47/SalaryApp.git
   ```

2. **Navigate to the project directory:**

   ```bash
   cd SalaryApp
   ```

3. **Install dependencies:**

   ```bash
   npm install
   # or
   yarn install
   ```

4. **Set up environment variables:**

   Create a `.env.local` file in the root directory and add the following:

   ```env
   MONGO_URL=your-database-url
   NEXTAUTH_SECRET=your-secret
   GOOGLE_CLIENT_ID=your-google-auth-client-id
   GOOGLE_CLIENT_SECRET=your-google-auth-client-secret
   ```

5. **Run the development server:**

   ```bash
   npm run dev
   # or
   yarn dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser to view the app.

---

## 🚀 Deployment

To deploy the app in a production environment:

1. **Build the application:**

   ```bash
   npm run build
   # or
   yarn build
   ```

2. **Start the production server:**

   ```bash
   npm run start
   # or
   yarn start
   ```

The app will run on [http://localhost:3000](http://localhost:3000) by default. Make sure your environment variables are set as in `.env.local`.

---

## 🌟 Usage

- **Authentication:** Secure login with Google OAuth (or your preferred provider).
- **Dashboard:** Access modules for Employees, Salaries, EPF/ETF, and B-Cards.
- **Navigation:** Use the sidebar to switch between modules.
- **Reports & Exports:** Download generated reports and payslips as needed.

---

## 📈 Additional Insights

- Supports half-days and full-days for precise OT and attendance tracking.
- Color-coded suggestions (e.g., green for early buses, red for late buses) enhance visual feedback.
- Automated calculations reduce manual labor and ensure accurate salary processing.
- Data security and privacy are ensured throughout.

---

## 👥 Support & Contact

For support, customization, or further inquiries, contact us at:

📧 **[salaryapp2025@gmail.com](mailto:salaryapp2025@gmail.com)**

---

## 📌 Links

- **Live App:** [https://salary-mocha.vercel.app/](https://salary-mocha.vercel.app/)
- **GitHub Repo:** [https://github.com/anush47/SalaryApp](https://github.com/anush47/SalaryApp)
