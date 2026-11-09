# EduRise — User Guide

A practical guide to signing in and using the current EduRise school platform

**Version 1.0 — 1 November 2026**

## 1. About EduRise

EduRise is a multi-school platform intended to support school administration and student performance workflows. Each school is provisioned with a separate tenant database so its school data is isolated from other schools.

This guide describes the frontend currently supplied. It distinguishes available screens from workflows that are still under development.

## 2. User roles

| Role | Who uses it | Current frontend access |
| --- | --- | --- |
| Superadmin | Platform owner / central administrator | Create schools, view/search schools, activate or deactivate schools. |
| School Admin | Administrator of one school | School overview, classes and performance dashboard response. |
| Teacher | Teacher account within a school | Teacher overview, available classes and performance dashboard response. |
| Parent | Parent or guardian | Login supported; dedicated dashboard not yet implemented. |
| Student | Student account | Login supported; dedicated dashboard not yet implemented. |

## 3. Before signing in

- You must have an account created by the platform or school administrator.
- Superadmin: use your registered email and password.
- School users: use your school code, registered email and password.
- Use only your own account. Keep your password and activation links private.

## 4. Sign in

### 4.1 Superadmin login

1. Open the EduRise frontend in a browser.
2. Go to /superadmin/login. For local development, use http://localhost:3000/superadmin/login.
3. Enter your registered email address and password.
4. Select Sign in. After successful authentication, the platform dashboard opens.

### 4.2 School user login

1. Open your school login URL. Example: /school/LTL001/login. Replace LTL001 with the code supplied by your school.
2. Enter the school code if prompted, your registered email address and password.
3. Select Sign in. A valid school account is directed to the dashboard.
4. Use the exact school code supplied by your administrator; codes are school-specific.

> **Note:** Both login pages use the backend endpoint POST /auth/login. The Superadmin page validates the superadmin role. The school login accepts school_admin, teacher, parent and student roles.

## 5. Superadmin dashboard

1. Review the Platform overview and the total, active and inactive school counts.
2. Select Add school.
3. Enter the full school name.
4. Enter a unique school code containing 3–50 letters or numbers, with no spaces or special characters. Example: SUN001.
5. Select Create school. The backend is expected to provision a separate tenant database.
6. Use the search box to find a school by name, code or status.
7. Select Activate or Deactivate to change school access status, then confirm the prompt.
8. Select Refresh to reload dashboard data.

> **Note:** Only deactivate a school when authorised. A deactivated school may lose access to its school services.

## 6. School Admin dashboard

The current dashboard shows the school overview, school code, role and classes returned by the backend.

- Review School classes for class name, section and academic year.
- Review Performance overview when the backend returns performance data.
- Select Refresh to reload the dashboard and class information.
- Contact the administrator if your school code is missing, your account is inactive or access is denied.

The current frontend does not yet expose complete workflows for managing staff, parents, subjects, exams, marks or imports. Do not assume these actions are available from this dashboard.

## 7. Teacher dashboard

Sign in using your school code and teacher account. The current dashboard displays classes available to your account and the performance overview response returned by the backend.

- Check the Your classes table.
- Check Performance overview if data is available.
- Select Refresh to reload the latest information.

The current frontend does not yet expose complete teacher workflows for entering marks, editing student records, attendance or report generation.

## 8. Parent and Student accounts

Parent and Student roles are accepted by the school login page. However, the current dashboard displays a “dashboard is coming next” message for these roles.

Parents and students should contact their school administrator for information about when their dedicated dashboards will be enabled.

## 9. Sign out

1. Find the user area at the bottom of the dashboard sidebar.
2. Select the sign-out icon/button.
3. EduRise clears the saved login session from the browser and returns you to the login page.

Always sign out when using a shared or public computer.

## 10. Common problems

| Problem | What to check / action |
| --- | --- |
| Invalid email or password | Check spelling, Caps Lock and that you are using the correct account. |
| School code missing/incorrect | Use the exact code supplied by your school administrator and reopen the matching school login URL. |
| Permission denied | Your role may not be allowed to perform the action. Contact the platform/school administrator. |
| Account inactive or not found | Ask the administrator to verify that your account exists and is active. |
| Dashboard/network error | Check that frontend and backend are running and NEXT_PUBLIC_API_URL points to the correct API server. |
| CORS/browser network error | The backend must allow the frontend origin and the Authorization and Content-Type headers. |
| No classes appear | The API may return an empty list, or classes may not yet be created/assigned. Contact the school administrator. |
| Parent/Student sees “coming next” | This is a current product limitation; dedicated dashboards are not implemented yet. |

## 11. Privacy and account safety

- Use only the account assigned to you.
- Never share your password or one-time activation link/token.
- Sign out after using a shared computer.
- Do not attempt to access another school’s records.
- Report unexpected access, missing records or suspicious activity to the platform administrator.

## 12. Technical setup (software operator)

This section is for the person installing or maintaining EduRise, not everyday users.

- Frontend: Next.js. Configure NEXT_PUBLIC_API_URL in the frontend environment file.
- Example local frontend URL: http://localhost:3000.
- Example local API URL from the supplied .env.example: http://127.0.0.1:5000.
- From the frontend project folder, run npm install on first setup, then npm run dev.
- The backend and PostgreSQL must be running and reachable for login and dashboard API calls.
- Never publish .env files, development credentials, JWT secrets or database passwords.

> **Note:** The production domain, account provisioning process, password reset procedure, backup policy and support contact depend on the organisation’s deployment. Configure these before distributing this guide to a live school.

## 13. Current feature status

| Feature | Status in supplied frontend |
| --- | --- |
| Superadmin login | Available |
| School login (school_admin, teacher, parent, student) | Available |
| Superadmin school list/create/search/activate/deactivate | Available |
| School Admin overview/classes/performance response | Available, based on backend API response |
| Teacher overview/classes/performance response | Available, based on backend API response |
| Parent dashboard | Not yet implemented |
| Student dashboard | Not yet implemented |
| Teacher marks entry/attendance workflows | Not exposed in current frontend |
| School admin user/subject/exam management | Not exposed in current frontend |

## 14. Help and support

For login credentials, school code, account activation, permissions or missing school data, contact your school’s designated EduRise administrator. For platform-wide issues, contact the EduRise platform administrator.

Document version: 1.0 — 1 November 2026. This guide reflects the frontend supplied for review; update it whenever screens, roles or workflows change.
