# BeeOne - Hệ thống Quản lý Nhân sự & Chấm công

## 📋 Tổng quan hệ thống

BeeOne là hệ thống quản lý nhân sự và chấm công được xây dựng trên nền tảng Odoo 18.0, được thiết kế cho các doanh nghiệp B2C cần quản lý attendance và phân quyền truy cập chi tiết. Hệ thống bao gồm 2 module chính với tính năng bảo mật nâng cao và báo cáo trực quan.

## 🏗️ Kiến trúc hệ thống

```
📁 addons/
├── 👥 beeone/              # HR Attendance Management & Security
└── 🏠 home_menu/           # Home Menu & Navigation (Shared)
```

## 📦 Module Chi tiết

### 👥 beeone - HR Attendance Management & Security

**Mục đích:** Quản lý chấm công nhân viên với báo cáo pivot/graph và bảo mật debug mode

**Chức năng chính:**

- ⏰ **Attendance Tracking**: Quản lý chấm công check-in/check-out với trạng thái màu sắc
- 📊 **Pivot Reports**: Báo cáo tổng hợp giờ làm việc theo nhân viên/ngày/tháng
- 📈 **Graph Analytics**: Biểu đồ cột thống kê attendance
- 🔐 **Debug Guard**: Bảo mật chặn debug mode cho non-admin users (backend + frontend)
- 👤 **Role-based Views**: Views khác nhau cho Manager và Employee/Marketing
- 🎨 **List View Decorations**: Màu sắc phân biệt trạng thái (xanh = check-in, đỏ = check-out)

**Models chính:**

- `hr.attendance` (extended): Thêm field `color` để hiển thị màu sắc theo trạng thái

**Cấu trúc:**

```
beeone/
├── models/
│   ├── __init__.py
│   └── hr_attendance.py                    # Extended attendance model với color field
├── controllers/
│   ├── __init__.py
│   └── debug_guard.py                      # Security controller chặn debug mode
├── views/
│   └── attendance_view.xml                 # List, Pivot, Graph views + Actions + Menus
├── security/
│   ├── ir.model.access.csv                 # Model access rights
│   └── security.xml                        # User groups definition
├── static/
│   ├── description/
│   │   └── icon.png                        # Module icon
│   └── src/
│       └── js/
│           └── debug_guard.js              # Client-side debug blocking (Odoo 18 patch)
└── __manifest__.py                         # Module configuration
```

#### 🔐 Debug Guard System

**Architecture:** Dual-layer security (Backend + Frontend)

##### Backend Layer - `controllers/debug_guard.py`

**Routes:**

```python
@http.route(['/web', '/odoo', '/odoo/<path:subpath>'], type='http', auth='none')
```

**Security Logic:**

1. Manual user authentication check
2. Kiểm tra user có trong group `base.group_system` (Administrator)
3. Nếu **KHÔNG** phải admin:
   - Strip all debug parameters từ URL (`debug`, `debug=1`, `debug=0`, `debug=assets`)
   - Delete debug cookies: `"oe_debug_mode"`, `"debug_mode"`, `"odoo_debug"`
   - Redirect về clean URL
4. Nếu là admin: Allow access bình thường

**Key Features:**

- `auth='none'`: Không require session (manual check)
- Route chaining: Handle both `/web` và `/odoo` routes
- Cookie cleanup: Đảm bảo client không retain debug state
- Redirect với clean URL: User không thấy được debug params

##### Frontend Layer - `static/src/js/debug_guard.js`

**Technology:** Odoo 18.0 OWL Patch System

**Implementation:**

```javascript
/** @odoo-module **/
import { WebClient } from "@web/webclient/webclient";
import { patch } from "@web/core/utils/patch";

patch(WebClient.prototype, {
  setup() {
    super.setup();

    // Check if user is NOT admin
    if (!this.user.isSystemUser) {
      // Strip debug from URL
      // Delete debug cookies
      // Reload if cleaned
    }
  },
});
```

**Key Features:**

- **Odoo 18 Syntax**: Sử dụng `patch(Class.prototype, {})` thay vì cũ syntax
- **Super call**: `super.setup()` để maintain parent behavior
- **Client-side validation**: Double-check sau khi load page
- **Auto-reload**: Tự động reload nếu phát hiện debug params

**Security Flow:**

```
User Request with ?debug=1
    ↓
Backend Controller (debug_guard.py)
    ├─→ Is Admin? → Allow access
    └─→ Not Admin → Strip params → Redirect clean URL
        ↓
Page Load
    ↓
Frontend Patch (debug_guard.js)
    ├─→ Is Admin? → Continue
    └─→ Not Admin → Re-check → Strip → Reload if needed
```

#### 📊 Attendance Views

##### 1. User View (Employee & Marketing)

**Action:** `action_hr_attendance_user`

**Features:**

- **View Modes**: `pivot,graph` (chỉ báo cáo, không list)
- **Domain Filter**: `[('employee_id.user_id', '=', uid)]` - Chỉ xem attendance của chính mình
- **Target**: `current` - Load trong main window
- **Groups**: `beeone.group_beeone_employee`, `beeone.group_beeone_marketing`

**Use Case:** Nhân viên xem báo cáo giờ làm việc cá nhân

##### 2. Manager View

**Action:** `action_hr_attendance_manager`

**Features:**

- **View Modes**: `pivot,graph,list` - Full access kể cả list view
- **Domain Filter**: `[]` - Không filter, xem toàn bộ nhân viên
- **Target**: `current`
- **Groups**: `beeone.group_beeone_manager`

**Use Case:** Quản lý xem toàn bộ attendance của tất cả nhân viên

##### List View - `view_hr_attendance_list_custom`

**Key Configuration:**

```xml
<tree js_class="attendance_list_view"
      decoration-success="check_out == False"
      decoration-danger="check_out != False">

    <field name="color" invisible="1"/>
    <field name="employee_id" width="200px"/>
    <field name="check_in" widget="datetime"/>
    <field name="check_out" widget="datetime"/>
    <field name="worked_hours" widget="float_time"/>
</tree>
```

**Features:**

- `js_class="attendance_list_view"`: Custom JS class (có thể extend)
- `decoration-success`: Màu xanh khi chưa check-out (đang làm việc)
- `decoration-danger`: Màu đỏ khi đã check-out (đã kết thúc ca)
- `employee_id width="200px"`: Fixed width tránh quá rộng
- `color` field: Invisible, dùng cho logic màu sắc

##### Pivot View - `view_hr_attendance_pivot_custom`

**Configuration:**

```xml
<pivot>
    <field name="employee_id" type="row"/>
    <field name="check_in" interval="day" type="col"/>
    <field name="worked_hours" widget="float_time" type="measure"/>
</pivot>
```

**Features:**

- **Row Grouping**: Theo nhân viên
- **Column Grouping**: Theo ngày (interval="day")
- **Measure**: Tổng giờ làm việc (float_time format: 8.5 = 8:30)
- **Use Case**: Ma trận giờ làm việc [Nhân viên x Ngày]

##### Graph View - `view_hr_attendance_graph_custom`

**Configuration:**

```xml
<graph type="bar">
    <field name="employee_id"/>
    <field name="worked_hours" widget="float_time" type="measure"/>
</graph>
```

**Features:**

- **Type**: Bar chart (biểu đồ cột)
- **X-Axis**: Tên nhân viên
- **Y-Axis**: Tổng giờ làm việc (float_time)
- **Use Case**: So sánh trực quan giờ làm việc giữa các nhân viên

#### 👥 User Groups

**Định nghĩa:** `security/security.xml`

```xml
<record id="group_beeone_manager" model="res.groups">
    <field name="name">BeeOne Manager</field>
    <field name="category_id" ref="base.module_category_human_resources"/>
    <field name="implied_ids" eval="[(4, ref('hr.group_hr_user'))]"/>
</record>

<record id="group_beeone_employee" model="res.groups">
    <field name="name">BeeOne Employee</field>
    <field name="category_id" ref="base.module_category_human_resources"/>
</record>

<record id="group_beeone_marketing" model="res.groups">
    <field name="name">BeeOne Marketing</field>
    <field name="category_id" ref="base.module_category_human_resources"/>
</record>
```

**Access Matrix:**

| Feature            | Manager | Employee | Marketing | Admin |
| ------------------ | ------- | -------- | --------- | ----- |
| List View          | ✅      | ❌       | ❌        | ✅    |
| Pivot View         | ✅      | ✅       | ✅        | ✅    |
| Graph View         | ✅      | ✅       | ✅        | ✅    |
| All Employees Data | ✅      | ❌       | ❌        | ✅    |
| Own Data Only      | N/A     | ✅       | ✅        | N/A   |
| Debug Mode         | ❌      | ❌       | ❌        | ✅    |
| Menu Access        | ✅      | ✅       | ✅        | ✅    |

#### 📋 Menu Structure

**XML Configuration:**

```xml
<menuitem id="menu_hr_attendance_root"
          name="Attendance"
          sequence="10"/>

<menuitem id="menu_hr_attendance_user"
          name="My Attendance"
          parent="menu_hr_attendance_root"
          action="action_hr_attendance_user"
          groups="group_beeone_employee,group_beeone_marketing"
          sequence="10"/>

<menuitem id="menu_hr_attendance_manager"
          name="All Attendance"
          parent="menu_hr_attendance_root"
          action="action_hr_attendance_manager"
          groups="group_beeone_manager"
          sequence="20"/>
```

**Menu Tree:**

```
Attendance (Root)
├── My Attendance (Employee, Marketing)
│   └─→ Action: Pivot + Graph (own data)
└── All Attendance (Manager)
    └─→ Action: Pivot + Graph + List (all data)
```

**Dependencies:** `base`, `web`, `hr`, `hr_attendance`

---

### 🏠 home_menu - Home Menu & Navigation (Shared Module)

**Mục đích:** Tùy chỉnh menu chính, navigation và routing theo user group

**Chức năng chính:**

- 🧭 **Custom Menu Structure**: Tùy chỉnh menu tree theo role
- 🔗 **Smart Navigation**: Redirect users về menu phù hợp khi login
- 🎨 **Home Page Customization**: Custom home page theo user group
- 📱 **Mobile-friendly Navigation**: Responsive menu cho mobile devices
- 👤 **User Context**: Lưu trữ navigation preferences

**Key Features:**

- Auto-redirect based on user group
- Custom navbar với webclient patches
- Home button functionality
- Menu blocking for specific roles

**Cấu trúc:**

```
home_menu/
├── models/
│   └── home_menu.py                        # Menu model & logic
├── static/src/
│   ├── js/backend/
│   │   ├── web_client.js                   # WebClient patches for routing
│   │   ├── navbar.js                       # Navbar customization
│   │   └── custom_user_item.js             # User menu items
│   └── xml/backend/
│       └── navbar.xml                      # Navbar QWeb templates
├── views/
│   ├── home_menu.xml                       # Home menu structure
│   └── menu_item.xml                       # Menu item definitions
└── security/
    └── ir.model.access.csv                 # Access rights
```

**User Routing Logic (BeeOne Project):**

```javascript
// web_client.js
const GROUP_ROUTES = {
  "beeone.group_beeone_manager": "home_menu.home_root",
  "beeone.group_beeone_employee": "home_menu.home_root",
  "beeone.group_beeone_marketing": "home_menu.home_root",
};

// navbar.js
if (user.groups.includes("base.group_system")) {
  // Admin: Default Odoo behavior
} else if (user.groups.includes("beeone.group_beeone_manager")) {
  // Manager: Redirect to Home Menu
  router.navigate("/web#menu_id=home_menu.home_root");
} else if (user.groups.includes("beeone.group_beeone_employee")) {
  // Employee: Redirect to Home Menu
  router.navigate("/web#menu_id=home_menu.home_root");
} else if (user.groups.includes("beeone.group_beeone_marketing")) {
  // Marketing: Redirect to Home Menu
  router.navigate("/web#menu_id=home_menu.home_root");
}
```

**Navigation Flow:**

```
User Login
    ↓
home_menu/web_client.js: Check user groups
    ↓
    ├─→ base.group_system? → Default Odoo Apps
    ├─→ beeone.group_beeone_manager? → home_menu.home_root
    ├─→ beeone.group_beeone_employee? → home_menu.home_root
    └─→ beeone.group_beeone_marketing? → home_menu.home_root
```

**Dependencies:** `base`, `web`

---

## 🔗 Mối quan hệ giữa các Module

```
home_menu (Base Navigation)
    ↓
beeone (HR Attendance + Security)
    ↓
    ├──→ Debug Guard (Backend + Frontend)
    ├──→ Attendance Management
    └──→ Reports (Pivot + Graph)
```

**Data Flow:**

```
Employee Check-in/Check-out
    ↓
hr.attendance (Extended with color field)
    ↓
    ├──→ List View (Manager only) - Decorations by status
    ├──→ Pivot View (All users) - Hours by employee/day
    └──→ Graph View (All users) - Bar chart comparison
    ↓
home_menu Navigation
```

## 🚀 Workflow Hoạt động

### 1. User Journey by Role

#### Employee/Marketing Flow:

```
Login → home_menu redirect → Home Menu
    ↓
Attendance Menu → My Attendance
    ↓
Pivot View (Own data only)
    ↓
Graph View (Own statistics)
    ↓
Analysis → Time tracking insights
```

#### Manager Flow:

```
Login → home_menu redirect → Home Menu
    ↓
Attendance Menu → All Attendance
    ↓
List View (All employees) - Check who's working
    ↓
Pivot View (All data) - Hours matrix
    ↓
Graph View (All statistics) - Compare employees
```

### 2. Security Workflow

#### Non-Admin User attempts Debug Mode:

```
User navigates to /web?debug=1
    ↓
Backend: debug_guard.py controller
    ├─→ Check: Is base.group_system? NO
    ├─→ Action: Strip debug params
    ├─→ Action: Delete debug cookies
    └─→ Redirect: /web (clean URL)
    ↓
Page Loads
    ↓
Frontend: debug_guard.js patch
    ├─→ Check: Is isSystemUser? NO
    ├─→ Action: Re-validate URL
    ├─→ Action: Clear cookies if found
    └─→ Reload: If debug detected
    ↓
Result: User cannot access debug mode
```

#### Admin User with Debug Mode:

```
Admin navigates to /web?debug=1
    ↓
Backend: debug_guard.py controller
    ├─→ Check: Is base.group_system? YES
    └─→ Allow: Continue with debug params
    ↓
Page Loads
    ↓
Frontend: debug_guard.js patch
    ├─→ Check: Is isSystemUser? YES
    └─→ Allow: Continue with debug mode
    ↓
Result: Admin can use debug mode
```

### 3. Attendance Data Flow

```
Employee Action (Check-in/Check-out)
    ↓
hr.attendance record created
    ├─→ check_in: timestamp
    ├─→ check_out: timestamp (or False)
    ├─→ worked_hours: auto-calculated
    └─→ color: computed based on check_out status
    ↓
Views Update
    ├─→ List View: decoration-success (green) if check_out == False
    │              decoration-danger (red) if check_out != False
    ├─→ Pivot View: Aggregate worked_hours by [employee x day]
    └─→ Graph View: Sum worked_hours per employee (bar chart)
    ↓
User sees updated reports
```

## 🔧 Cài đặt & Cấu hình

### Thứ tự cài đặt modules:

1. `home_menu` - Base navigation system (shared)
2. `beeone` - HR attendance & security

### Cấu hình cần thiết:

#### 1. User Groups Setup

```
Settings → Users & Companies → Groups
✓ BeeOne Manager: Full attendance access (list + pivot + graph)
✓ BeeOne Employee: Own attendance only (pivot + graph)
✓ BeeOne Marketing: Own attendance only (pivot + graph)
```

#### 2. User Assignment

```
Settings → Users → Select User
    ├─→ Access Rights tab
    └─→ Assign to appropriate group:
        - BeeOne Manager (for HR managers)
        - BeeOne Employee (for employees)
        - BeeOne Marketing (for marketing staff)
```

#### 3. Debug Guard Verification

```
Test as non-admin user:
1. Login as Employee/Marketing
2. Try: /web?debug=1 → Should redirect to /web
3. Try: /odoo?debug=assets → Should redirect to /odoo
4. Verify: No debug menu visible
5. Verify: Developer tools not accessible

Test as admin:
1. Login as Administrator
2. Try: /web?debug=1 → Should work
3. Verify: Debug menu visible
4. Verify: Developer tools accessible
```

#### 4. Menu Configuration

```
Settings → Technical → User Interface → Menu Items
✓ Attendance (Root menu)
  ├─→ My Attendance (Employee, Marketing)
  └─→ All Attendance (Manager)

Verify visibility per user group
```

#### 5. Home Menu Navigation

```
Settings → Technical → Actions → Window Actions
✓ Verify home_menu.home_root action exists
✓ Check web_client.js routing logic
✓ Test auto-redirect on login per user group
```

### Module Installation Commands:

```bash
# SSH vào Odoo container
docker exec -it <container_name> bash

# Update module list
odoo-bin -c /etc/odoo/odoo.conf -d <database> -u beeone,home_menu

# Restart container
docker restart <container_name>
```

### Upgrade Existing Installation:

```bash
# Upgrade chỉ beeone module
odoo-bin -c /etc/odoo/odoo.conf -d <database> -u beeone

# Upgrade cả 2 modules
odoo-bin -c /etc/odoo/odoo.conf -d <database> -u beeone,home_menu
```

## 📊 Key Features Summary

### 🤖 Automation

- ✅ Auto-calculate worked hours (check_out - check_in)
- ✅ Auto-update color field based on check_out status
- ✅ Real-time pivot/graph updates khi có attendance mới
- ✅ Auto-redirect users về home menu on login

### 🔐 Security

- ✅ **Dual-layer Debug Guard**: Backend controller + Frontend JS patch
- ✅ **Route Coverage**: Handle both `/web` and `/odoo` routes
- ✅ **Cookie Cleanup**: Delete all debug-related cookies
- ✅ **Client-side Validation**: Re-check trên browser sau page load
- ✅ **Role-based Access**: Manager vs Employee/Marketing views
- ✅ **Data Isolation**: Employees chỉ xem data của chính mình
- ✅ **Group-based Permissions**: ir.model.access.csv + security.xml

### 📱 User Experience

- ✅ **Responsive Design**: Works on desktop, tablet, mobile
- ✅ **Color-coded List**: Xanh (đang làm), Đỏ (đã kết thúc ca)
- ✅ **Fixed Column Width**: employee_id = 200px (không quá rộng)
- ✅ **Float Time Format**: 8.5 hours = 8:30 (dễ đọc)
- ✅ **Smart Routing**: Auto-navigate đúng menu theo role
- ✅ **Simplified Views**: Employee chỉ xem pivot+graph (không overwhelm)

### 🔌 Integration

- ✅ **Odoo 18 OWL Framework**: Modern patch syntax
- ✅ **HR Module Extension**: Extend hr.attendance model
- ✅ **Shared home_menu**: Reuse navigation từ DAC project
- ✅ **Standard Odoo Views**: Tương thích với Odoo ecosystem

## 🛠️ Technical Stack

- **Backend**: Odoo 18.0 (Python 3.10+)
- **Frontend**: OWL Framework (Odoo 18), JavaScript ES6+, CSS3
- **Database**: PostgreSQL 17
- **Views**: List (tree), Pivot, Graph (bar chart)
- **Security**: HTTP Controllers, JS Patches, Cookie Management
- **Deployment**: Docker Compose
- **Web Server**: Built-in Odoo werkzeug (or Nginx)

## 📈 Metrics & KPIs

### Attendance Metrics

- **Worked Hours**: Total hours per employee/day/week/month
- **Check-in Time**: Average check-in time per employee
- **Check-out Time**: Average check-out time per employee
- **Attendance Rate**: Percentage of days with attendance records
- **Overtime Hours**: Hours exceeding standard work hours

### Manager Dashboard Views

- **Employee Comparison**: Side-by-side hours worked (bar chart)
- **Daily Breakdown**: Hours matrix [Employee x Day] (pivot)
- **Current Status**: Who's currently working (list view decoration)
- **Weekly Summary**: Total hours per employee per week
- **Monthly Trends**: Attendance patterns over months

### Employee Self-service Views

- **My Hours**: Personal worked hours (pivot)
- **My Trends**: Personal attendance statistics (graph)
- **Time Tracking**: Own check-in/check-out history

## 🐛 Troubleshooting

### Common Issues

**1. Debug mode vẫn accessible cho non-admin**

- ✅ Check `debug_guard.py` controller đã load chưa
- ✅ Verify routes: `/web` và `/odoo` trong controller
- ✅ Check `debug_guard.js` asset đã register trong `__manifest__.py`
- ✅ Clear browser cache và cookies
- ✅ Restart Odoo container
- ✅ Check logs: `docker logs <container>`

**2. Employee không thấy pivot/graph view**

- ✅ Verify user assigned vào `group_beeone_employee` hoặc `group_beeone_marketing`
- ✅ Check action `action_hr_attendance_user` có groups correct
- ✅ Verify menu `menu_hr_attendance_user` có groups correct
- ✅ Upgrade module: `odoo-bin -u beeone`

**3. Manager không thấy list view**

- ✅ Verify user assigned vào `group_beeone_manager`
- ✅ Check action `action_hr_attendance_manager` view_mode = "pivot,graph,list"
- ✅ Verify `ir.model.access.csv` có permission cho manager
- ✅ Check `view_hr_attendance_list_custom` priority và sequence

**4. List view decorations không hoạt động**

- ✅ Verify `decoration-success` và `decoration-danger` syntax đúng
- ✅ Check field `check_out` có trong view tree
- ✅ Clear browser cache
- ✅ Check field `color` exist trong model (invisible field)

**5. Home menu redirect không work**

- ✅ Check `home_menu` module installed
- ✅ Verify `web_client.js` có GROUP_ROUTES mapping đúng
- ✅ Check user groups assignment
- ✅ Clear browser cache và reload
- ✅ Check `navbar.js` có handle groups correctly

**6. Worked_hours không tính đúng**

- ✅ Verify `check_in` và `check_out` có values
- ✅ Check timezone settings trong Odoo
- ✅ Verify widget `float_time` trong pivot/graph views
- ✅ Check model `hr.attendance` có compute method đúng

### Debug Commands

```bash
# Check module installed
docker exec -it <container> odoo-bin shell -d <database>
>>> self.env['ir.module.module'].search([('name', '=', 'beeone')])

# Check user groups
>>> user = self.env['res.users'].browse(<user_id>)
>>> user.groups_id.mapped('full_name')

# Check attendance records
>>> self.env['hr.attendance'].search([])

# Check views registered
>>> self.env['ir.ui.view'].search([('name', 'ilike', 'attendance')])

# Check actions
>>> self.env['ir.actions.act_window'].search([('name', 'ilike', 'attendance')])
```

### Logs Analysis

```bash
# Xem Odoo logs real-time
docker logs -f <container_name>

# Filter debug guard logs
docker logs <container_name> | grep "debug_guard"

# Filter attendance logs
docker logs <container_name> | grep "hr.attendance"

# Check Python errors
docker logs <container_name> | grep "ERROR"

# Check access denied
docker logs <container_name> | grep "AccessDenied"
```

## 🚀 Roadmap

### Phase 1 (Completed)

- ✅ Basic HR attendance module
- ✅ Debug guard security (backend + frontend)
- ✅ Pivot và graph views cho users
- ✅ List view decorations
- ✅ Manager vs Employee views separation
- ✅ home_menu navigation integration

### Phase 2 (Planned)

- 📋 **Mobile App**: Native mobile app cho check-in/check-out
- 📋 **GPS Tracking**: Location-based check-in validation
- 📋 **QR Code**: QR code scanning cho check-in
- 📋 **Face Recognition**: AI face recognition cho attendance
- 📋 **Shift Management**: Quản lý ca làm việc
- 📋 **Leave Management**: Tích hợp quản lý nghỉ phép

### Phase 3 (Future)

- 📋 **Payroll Integration**: Tính lương dựa trên attendance
- 📋 **Advanced Analytics**: AI-powered insights và predictions
- 📋 **Performance Tracking**: KPI tracking cho nhân viên
- 📋 **Integration với Biometric**: Fingerprint/Card readers
- 📋 **Notification System**: Push notifications cho check-in reminders
- 📋 **Report Export**: Auto-generate PDF/Excel reports

## 📞 Support

**Tác giả**: Huỳnh Quốc An
**Phiên bản**: 1.0  
**Cập nhật**: January 2025  
**Công ty**: BeeOne Company

---

## 📄 License

LGPL-3 License - See LICENSE file for details

---

## 🔗 Related Projects

- **DAC ERP System**: Hệ thống CRM và ERP đầy đủ (odoo-space project)
- **Shared Modules**: `home_menu` được share giữa DAC và BeeOne projects

## 📚 Documentation References

- [Odoo 18 Documentation](https://www.odoo.com/documentation/18.0/)
- [OWL Framework Guide](https://github.com/odoo/owl)
- [HR Attendance Module](https://www.odoo.com/documentation/18.0/applications/hr/attendance.html)
- [Odoo Security Guidelines](https://www.odoo.com/documentation/18.0/developer/reference/security.html)

---

**Note:** Hệ thống này được thiết kế để scale và extend. Các modules được xây dựng theo Odoo best practices và có thể dễ dàng tích hợp với các modules khác trong Odoo ecosystem.
