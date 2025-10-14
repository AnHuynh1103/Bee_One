/** @odoo-module **/

import { Component, useState, onWillStart, onMounted } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { rpc } from "@web/core/network/rpc"; // <— THÊM

const systray = registry.category("systray");

export class BeeoneAttendanceButton extends Component {
  setup() {
    this.orm = useService("orm");
    this.notification = useService("notification"); // giữ nguyên
    this.state = useState({
      loading: true,
      checkedIn: false,
      employeeId: null,
    });

    // Lấy UID bằng RPC, KHÔNG dùng service 'user'
    onWillStart(async () => {
      let uid = null;
      try {
        const s = await rpc("/web/session/get_session_info", {}); // <—
        uid = s && s.uid;
      } catch (_) {}

      if (!uid) {
        // không có uid => disable nút, tránh crash
        this.state.loading = false;
        return;
      }

      const rows = await this.orm.searchRead(
        "hr.employee",
        [["user_id", "=", uid]],
        ["attendance_state"]
      );
      if (rows.length) {
        this.state.employeeId = rows[0].id;
        this.state.checkedIn = rows[0].attendance_state === "checked_in";
      }
      this.state.loading = false;
    });

    onMounted(() => {
      const redDot = document.querySelector(
        ".o_main_navbar .o_menu_systray .o_hr_attendance_systray, \
        .o_main_navbar .o_menu_systray .o_attendance_systray_item"
      );
      if (redDot) redDot.remove(); // thay vì display:none
    });
  }

  async toggle() {
    if (!this.state.employeeId || this.state.loading) return;
    this.state.loading = true;
    try {
      await this.orm.call(
        "hr.employee",
        "attendance_action_change",
        [this.state.employeeId],
        {}
      );
      const [emp] = await this.orm.read(
        "hr.employee",
        [this.state.employeeId],
        ["attendance_state"]
      );
      this.state.checkedIn =
        (emp && emp.attendance_state === "checked_in") || false;
    } catch (e) {
      console.error(e);
      this.notification.add("Không chấm công được. Kiểm tra quyền/employee.", {
        type: "danger",
      });
    } finally {
      this.state.loading = false;
    }
  }
}
BeeoneAttendanceButton.template = "beeone.AttendanceSystrayButton";
BeeoneAttendanceButton.props = {};
systray.add(
  "BeeoneAttendanceButton",
  { Component: BeeoneAttendanceButton },
  { sequence: 1 }
);
