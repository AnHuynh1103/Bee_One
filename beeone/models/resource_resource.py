from odoo import models, fields

class ResourceResource(models.Model):
    _inherit = 'resource.resource'


    # Chỉ cần read để phục vụ avatar card, không bắt buộc store
    work_location_name = fields.Char(
        related="employee_id.work_location_name", readonly=True
    )
    work_location_type = fields.Selection(
        related="employee_id.work_location_type", readonly=True
    )