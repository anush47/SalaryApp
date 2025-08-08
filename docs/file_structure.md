# File Structure

## Root Directory

- **.eslintrc.json**: Configuration file for ESLint, a tool for identifying and reporting on patterns found in ECMAScript/JavaScript code.
- **.gitignore**: Specifies intentionally untracked files that Git should ignore.
- **next.config.mjs**: Configuration file for Next.js.
- **package.json**: Contains metadata about the project and its dependencies.
- **package-lock.json**: Records the exact version of each installed package which allows you to re-install them.
- **postcss.config.mjs**: Configuration file for PostCSS.
- **README.md**: Contains information about the project.
- **tailwind.config.ts**: Configuration file for Tailwind CSS.
- **tsconfig.json**: Configuration file for TypeScript.
- **run.bat**: A batch script to run the application.

## src Directory

- **middleware.ts**: The middleware for the application.

## src/app Directory

- **globals.css**: Global CSS file for the application.
- **HomePageClient.tsx**: The client-side component for the home page.
- **layout.tsx**: The root layout for the application.
- **loading.tsx**: A loading component that is displayed while pages are loading.
- **manifest.ts**: The web app manifest.
- **NextAuthProvider.tsx**: A provider for NextAuth.js.
- **page.tsx**: The main page of the application.
- **QueryProvider.tsx**: A provider for React Query.
- **theme-provider.tsx**: A provider for the theme.

## src/app/admin Directory

- **page.tsx**: The main page for the admin section.

### src/app/admin/clientComponents Directory

- **adminMainBox.tsx**: The main content box for the admin section.
- **AdminNavContainer.tsx**: The navigation container for the admin section.
- **adminSideBar.tsx**: The sidebar for the admin section.

### src/app/admin/calendar Directory

- **Calendar.tsx**: A component that displays a calendar of holidays.
- **CreateHolidaysDialog.tsx**: A dialog for creating new holidays.

### src/app/admin/unAuthorize Directory

- **UnAuthorize.tsx**: A component that is displayed when a user is not authorized to view a page.

### src/app/admin/users Directory

- **CreateUserDialog.tsx**: A dialog for creating new users.
- **Users.tsx**: A component that displays a list of users.

## src/app/api/auth/[...nextauth] Directory

- **next-auth.d.ts**: Type definitions for NextAuth.js.
- **options.tsx**: Configuration options for NextAuth.js.
- **route.tsx**: The main route for NextAuth.js.

## src/app/api/auth/changePassword Directory

- **route.tsx**: The route for changing a user's password.

## src/app/api/calendar/holidays Directory

- **holidayHelper.tsx**: A helper file for holiday-related functions.
- **route.tsx**: The route for getting holidays.

## src/app/api/companies Directory

- **route.tsx**: The route for getting, creating, updating, and deleting companies.

## src/app/api/companies/getReferenceNoName Directory

- **route.tsx**: The route for getting the reference number and name for a company.

## src/app/api/employees Directory

- **route.tsx**: The route for getting, creating, updating, and deleting employees.

## src/app/api/employees/formA Directory

- **aFormFieldMap.tsx**: A map of the fields in the Form A PDF.
- **AFormFillPDF.tsx**: A component that fills the Form A PDF.
- **route.tsx**: The route for filling the Form A PDF.

## src/app/api/payments Directory

- **route.tsx**: The route for getting, creating, updating, and deleting payments.

## src/app/api/payments/generate Directory

- **paymentGeneration.tsx**: A component that generates payments.
- **route.tsx**: The route for generating payments.

## src/app/api/pdf Directory

- **attendance.tsx**: A component that generates an attendance PDF.
- **epf.tsx**: A component that generates an EPF PDF.
- **etf.tsx**: A component that generates an ETF PDF.
- **helpers.tsx**: A helper file for PDF-related functions.
- **payslip.tsx**: A component that generates a payslip PDF.
- **route.tsx**: The route for generating PDFs.
- **salary.tsx**: A component that generates a salary PDF.

## src/app/api/purchases Directory

- **route.tsx**: The route for getting, creating, updating, and deleting purchases.

## src/app/api/purchases/check Directory

- **checkPurchased.tsx**: A helper function to check if a period has been purchased for a company.
- **route.tsx**: The route for checking if a period has been purchased for a company.

## src/app/api/purchases/price Directory

- **priceUtils.tsx**: Utility functions for calculating prices.
- **route.tsx**: The route for calculating prices.

## src/app/api/salaries Directory

- **initialInOutProcess.tsx**: Processes raw in/out data from CSV.
- **route.tsx**: The route for getting, creating, updating, and deleting salaries.
- **salaryProcessing.tsx**: Contains functions for processing salary and in/out data.

## src/app/api/salaries/generate Directory

- **route.tsx**: The route for generating salaries.
- **salaryGeneration.tsx**: Contains functions for generating salary data.

## src/app/api/users Directory

- **route.tsx**: The route for getting, creating, updating, and deleting users.

## src/app/auth/signIn Directory

- **page.tsx**: The sign-in page.
- **userAgreementDialog.tsx**: A dialog displaying the user agreement.

## src/app/context Directory

- **LanguageContext.tsx**: Provides language context to the application.
- **SnackbarContext.tsx**: Provides a snackbar context for displaying messages.

## src/app/help Directory

- **DemoContent.tsx**: Displays a demo video of the application.
- **HelpContent.tsx**: Displays the content of the help sections.
- **helpData.ts**: Contains the data for the help content.
- **HelpIndex.tsx**: Displays the table of contents for the help sections.
- **LanguageSelector.tsx**: Allows users to select the language for the help content.
- **page.tsx**: The main help page.
- **SearchBar.tsx**: A search bar for searching help topics.

## src/app/lib Directory

- **consts.tsx**: Contains constants for the application.
- **db.tsx**: Connects to the MongoDB database.

## src/app/models Directory

- **Company.tsx**: Mongoose model for company data.
- **Employee.tsx**: Mongoose model for employee data.
- **Holiday.tsx**: Mongoose model for holiday data.
- **Payment.tsx**: Mongoose model for payment data.
- **Purchase.tsx**: Mongoose model for purchase data.
- **Salary.tsx**: Mongoose model for salary data.
- **User.tsx**: Mongoose model for user data.

## src/app/policies/agreement Directory

- **agreement.tsx**: The user agreement content.
- **page.tsx**: The page displaying the user agreement.

## src/app/policies/privacy Directory

- **page.tsx**: The page displaying the privacy policy.

## src/app/policies/terms Directory

- **page.tsx**: The page displaying the terms of service.

## src/app/user Directory

- **page.tsx**: The main page for the user section.

### src/app/user/clientComponents Directory

- **NavContainer.tsx**: The navigation container for the user section.
- **userMainBox.tsx**: The main content box for the user section.
- **userSideBar.tsx**: The sidebar for the user section.

## src/app/user/employees Directory

- **employees.tsx**: The main component for managing employees.

### src/app/user/employees/clientComponents Directory

- **employeesDataGrid.tsx**: Displays a data grid of employees.

## src/app/user/mycompanies Directory

- **myCompanies.tsx**: The main component for managing user companies.

### src/app/user/mycompanies/clientComponents Directory

- **AddCompany.tsx**: A form for adding new companies.
- **companiesCards.tsx**: Displays companies as cards.
- **companiesDataGrid.tsx**: Displays companies in a data grid.
- **companyValidation.tsx**: Contains validation logic for company forms.

## src/app/user/mycompanies/[id] Directory

- **loading.tsx**: A loading component for the company details page.
- **page.tsx**: The main page for a specific company.

### src/app/user/mycompanies/[id]/clientComponents Directory

- **companyMainBox.tsx**: The main content box for a specific company's details.
- **companySideBar.tsx**: The sidebar for a specific company's details.
- **NavContainer.tsx**: The navigation container for a specific company's details.

### src/app/user/mycompanies/[id]/companyDetails Directory

- **ChangeUser.tsx**: A component for changing the user associated with a company.
- **companyDetails.tsx**: Displays and allows editing of company details.
- **paymentStructure.tsx**: A component for managing the payment structure of a company.
- **shifts.tsx**: A component for managing the shifts of a company.
- **workingDays.tsx**: A component for managing the working days of a company.

### src/app/user/mycompanies/[id]/documents Directory

- **documents.tsx**: The main component for generating documents.
- **salariesIncludeDataGrid.tsx**: Displays a data grid of salaries to be included in documents.

### src/app/user/mycompanies/[id]/employees Directory

- **employees.tsx**: The main component for managing employees within a specific company.

#### src/app/user/mycompanies/[id]/employees/clientComponents Directory

- **AH.tsx**: A component for generating Form A for an employee.
- **AddEmployee.tsx**: A form for adding new employees.
- **EditEmployee.tsx**: A form for editing existing employee details.
- **employeesDataGrid.tsx**: Displays a data grid of employees for a specific company.

### src/app/user/mycompanies/[id]/payments Directory

- **payments.tsx**: The main component for managing payments within a specific company.
- **editPaymentForm.tsx**: A form for editing existing payment details.
- **newPaymentForm.tsx**: A form for adding new payment details.
- **paymentsDataGrid.tsx**: Displays a data grid of payments for a specific company.

### src/app/user/mycompanies/[id]/purchases Directory

- **purchases.tsx**: The main component for managing purchases within a specific company.
- **newPurchaseForm.tsx**: A form for adding new purchase details.
- **purchasesDataGrid.tsx**: Displays a data grid of purchases for a specific company.

### src/app/user/mycompanies/[id]/quick Directory

- **quick.tsx**: Provides quick tools for managing salaries and payments.

### src/app/user/mycompanies/[id]/salaries Directory

- **salaries.tsx**: The main component for managing salaries within a specific company.
- **csvUpload.tsx**: Utility functions for handling CSV file uploads.
- **editSalaryForm.tsx**: A form for editing existing salary details.
- **employeesInclude.tsx**: A component for selecting employees to include in salary generation.
- **generateSalaryAll.tsx**: Generates salaries for all employees in a company.
- **generateSalaryForm.tsx**: A form for generating new salary records.
- **generateSalaryOne.tsx**: Generates salary for a single employee.
- **generatedSalaries.tsx**: Displays a data grid of generated salaries.
- **inOutTable.tsx**: Displays and allows editing of in/out records.
- **salariesDataGrid.tsx**: Displays a data grid of salaries for a specific company.

## src/app/user/payments Directory

- **payments.tsx**: The main component for managing payments.
- **paymentsDataGrid.tsx**: Displays a data grid of payments.

## src/app/user/purchases Directory

- **purchases.tsx**: The main component for managing purchases.
- **purchasesDataGrid.tsx**: Displays a data grid of purchases.
- **updatePurchaseForm.tsx**: A form for updating purchase details.

## src/app/user/quick Directory

- **quick.tsx**: Displays quick tools and a welcome message for the user.

## src/app/user/salaries Directory

- **salaries.tsx**: The main component for managing salaries.
- **salariesDataGrid.tsx**: Displays a data grid of salaries.

## src/app/user/settings Directory

- **settings.tsx**: The main component for user settings.

### src/app/user/settings/clientComponents Directory

- **changePasswordDialog.tsx**: A dialog for changing user password.
- **editForm.tsx**: A form for editing user profile information.
