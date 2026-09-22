import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { setMoneyLang } from '@/lib/format'

export type Lang = 'ar' | 'en'

const dict = {
  // عام
  'app.title': { ar: 'نظام صيانة مطار القيصومة', en: 'Qaisumah Airport Maintenance' },
  'app.subtitle': { ar: 'الصيانة الدورية والتصحيحية', en: 'Preventive & Corrective' },
  'app.footer': { ar: 'مطار القيصومة — المجال العربي', en: 'Qaisumah Airport — Al Majal Al Arabi' },
  'lang.switch': { ar: 'English', en: 'العربية' },
  'role.current': { ar: 'الدور الحالي:', en: 'Current role:' },
  'role.hint': { ar: 'الدور الحالي يحدد صلاحيات التعديل والإضافة', en: 'The current role controls editing permissions' },
  'common.save': { ar: 'حفظ', en: 'Save' },
  'common.cancel': { ar: 'إلغاء', en: 'Cancel' },
  'common.add': { ar: 'إضافة', en: 'Add' },
  'common.close': { ar: 'إغلاق', en: 'Close' },
  'common.notes': { ar: 'ملاحظات', en: 'Remarks' },
  'common.date': { ar: 'التاريخ', en: 'Date' },
  'common.qty': { ar: 'الكمية', en: 'Qty' },
  'common.search': { ar: 'بحث…', en: 'Search…' },
  'common.total': { ar: 'الإجمالي', en: 'Total' },
  'common.none': { ar: 'لا يوجد', en: 'None' },
  'common.back': { ar: 'عودة', en: 'Back' },
  'common.view': { ar: 'عرض', en: 'View' },
  'common.available': { ar: 'المتاح', en: 'On Hand' },
  'common.actions': { ar: 'إجراءات', en: 'Actions' },
  'common.sn': { ar: 'م', en: 'S/N' },
  'common.all': { ar: 'الكل', en: 'All' },
  'common.edit': { ar: 'تعديل', en: 'Edit' },
  'common.delete': { ar: 'حذف', en: 'Delete' },
  'common.deleted': { ar: 'تم الحذف', en: 'Deleted' },
  'common.confirmDelete': { ar: 'هل أنت متأكد من الحذف؟', en: 'Are you sure you want to delete this item?' },

  // القائمة الجانبية
  'nav.dashboard': { ar: 'لوحة التحكم', en: 'Dashboard' },
  'nav.items': { ar: 'الأصناف', en: 'Items' },
  'nav.inbound': { ar: 'سندات الوارد', en: 'Inbound Vouchers' },
  'nav.outbound': { ar: 'سندات الصادر', en: 'Outbound Vouchers' },
  'nav.inventory': { ar: 'رصيد المخزون', en: 'Stock Balance' },
  'nav.purchases': { ar: 'طلبات الشراء', en: 'Purchase Requests' },
  'nav.purchasesNew': { ar: 'نموذج طلب شراء', en: 'New Purchase Request' },
  'nav.petty': { ar: 'البيتي كاش', en: 'Petty Cash' },
  'nav.janitorial': { ar: 'مواد النظافة', en: 'Janitorial Supplies' },
  'nav.consumables': { ar: 'المستهلكات', en: 'Consumables' },

  // لوحة التحكم
  'dash.title': { ar: 'لوحة التحكم', en: 'Dashboard' },
  'dash.items': { ar: 'عدد الأصناف', en: 'Items' },
  'dash.inbound': { ar: 'سندات الوارد', en: 'Inbound vouchers' },
  'dash.outbound': { ar: 'سندات الصادر', en: 'Outbound vouchers' },
  'dash.purchases': { ar: 'طلبات الشراء', en: 'Purchase requests' },
  'dash.lowStock': { ar: 'أصناف تحتاج إعادة طلب', en: 'Items below reorder level' },
  'dash.lowStockOk': { ar: 'جميع الأصناف فوق حد الطلب الأدنى.', en: 'All items are above the reorder level.' },
  'dash.available': { ar: 'المتاح', en: 'On hand' },
  'dash.minStock': { ar: 'الحد الأدنى', en: 'Min' },
  'dash.pendingCircuit': { ar: 'طلبات الشراء قيد الدوران', en: 'Purchase requests in circulation' },
  'dash.waitingFor': { ar: 'بانتظار', en: 'Waiting for' },
  'dash.noPending': { ar: 'لا توجد طلبات معلقة.', en: 'No pending requests.' },
  'dash.yourTurn': { ar: 'بانتظار موافقتك', en: 'Awaiting your approval' },
  'dash.requests': { ar: 'طلب', en: 'requests' },
  'dash.showSign': { ar: 'عرض والتوقيع', en: 'Review & sign' },
  'dash.pettyTotal': { ar: 'إجمالي مصروف البيتي كاش', en: 'Total petty cash spent' },
  'dash.pettyMonth': { ar: 'مصروف البيتي كاش — الشهر الحالي', en: 'Petty cash — current month' },
  'dash.janitorial': { ar: 'بنود مواد النظافة', en: 'Janitorial line items' },
  'dash.consumables': { ar: 'بنود المستهلكات', en: 'Consumable line items' },

  // الأصناف
  'items.title': { ar: 'الأصناف', en: 'Items' },
  'items.add': { ar: 'إضافة صنف', en: 'Add item' },
  'items.new': { ar: 'إضافة صنف جديد', en: 'New item' },
  'items.partNo': { ar: 'رقم القطعة (Part No)', en: 'Part No' },
  'items.description': { ar: 'الوصف', en: 'Description' },
  'items.category': { ar: 'التصنيف', en: 'Category' },
  'items.uom': { ar: 'وحدة القياس', en: 'UOM' },
  'items.minStock': { ar: 'حد الطلب الأدنى', en: 'Min stock level' },
  'items.stock': { ar: 'الرصيد الحالي', en: 'Current balance' },
  'items.none': { ar: 'لا توجد أصناف', en: 'No items' },

  // السندات
  'v.in.title': { ar: 'سندات الوارد', en: 'Inbound vouchers' },
  'v.out.title': { ar: 'سندات الصادر', en: 'Outbound vouchers' },
  'v.in.new': { ar: 'سند وارد جديد', en: 'New inbound voucher' },
  'v.out.new': { ar: 'سند صادر جديد', en: 'New outbound voucher' },
  'v.no': { ar: 'رقم السند', en: 'Voucher no' },
  'v.item': { ar: 'الصنف', en: 'Item' },
  'v.ref': { ar: 'المرجع', en: 'Reference' },
  'v.attachments': { ar: 'المرفقات', en: 'Attachments' },
  'v.by': { ar: 'بواسطة', en: 'By' },
  'v.deletedItem': { ar: 'صنف محذوف', en: 'Deleted item' },
  'v.emptyIn': { ar: 'لا توجد سندات — اضغط زر الإضافة لإنشاء أول سند', en: 'No vouchers yet — click add to create the first one' },
  'v.dateLabel': { ar: 'التاريخ', en: 'Date' },
  'v.poRef': { ar: 'رقم أمر الشراء / المرجع', en: 'PO no / reference' },
  'v.refOut': { ar: 'مرجع / ملاحظة خارجة', en: 'Outgoing reference' },
  'v.linkedMrf': { ar: 'مرتبط بطلب شراء معتمد (اختياري — يملأ البنود تلقائياً)', en: 'Linked to an approved purchase request (optional — auto-fills items)' },
  'v.noLink': { ar: '— بدون ارتباط —', en: '— no link —' },
  'v.rows': { ar: 'البنود', en: 'Line items' },
  'v.pickItem': { ar: 'اختر الصنف…', en: 'Select item…' },
  'v.addRow': { ar: 'إضافة بند', en: 'Add line' },
  'v.attachIn': { ar: 'إرفاق الإيصال / مستند الاستلام (إلزامي)', en: 'Attach receipt / delivery document (required)' },
  'v.attachOut': { ar: 'إرفاق مستندات (اختياري)', en: 'Attach documents (optional)' },
  'v.save': { ar: 'حفظ السند', en: 'Save voucher' },
  'v.tabStock': { ar: 'استلام إلى المخزون', en: 'Receive into Stock' },
  'v.tabPetty': { ar: 'مشتريات تُسجَّل في البيتي كاش', en: 'Purchases Recorded in Petty Cash' },
  'v.errNoRows': { ar: 'أضف بنداً واحداً على الأقل', en: 'Add at least one line item' },
  'v.errNoReceipt': { ar: 'يجب إرفاق الإيصال / مستند الاستلام لسند الوارد', en: 'Receipt attachment is required for inbound vouchers' },
  'v.errStock': { ar: 'الرصيد غير كافٍ للصنف', en: 'Insufficient stock for item' },
  'v.saved': { ar: 'تم حفظ السند بنجاح', en: 'Voucher saved successfully' },
  'v.attachLabel': { ar: 'إرفاق مستندات', en: 'Attach documents' },
  'v.uploading': { ar: 'جارٍ الرفع…', en: 'Uploading…' },
  'v.attachHint': { ar: 'صورة الإيصال أو أمر الشراء — بصيغة PDF أو صورة، بحد أقصى 3 م.ب للملف', en: 'Receipt or PO image — PDF or image, max 3 MB per file' },
  'v.download': { ar: 'تحميل', en: 'Download' },

  // المخزون
  'inv.title': { ar: 'رصيد المخزون', en: 'Stock Balance' },
  'inv.movements': { ar: 'حركة الصنف', en: 'Item movements' },
  'inv.pick': { ar: 'اختر صنفاً لعرض حركته.', en: 'Select an item to view its movements.' },
  'inv.in': { ar: 'وارد', en: 'In' },
  'inv.out': { ar: 'صادر', en: 'Out' },
  'inv.type': { ar: 'النوع', en: 'Type' },
  'inv.noMoves': { ar: 'لا توجد حركات', en: 'No movements' },  'inv.low': { ar: 'تحت حد الطلب', en: 'Below min' },
  'inv.ok': { ar: 'متوفر', en: 'Available' },
  'inv.cat': { ar: 'الفئة', en: 'Category' },
  'inv.catWarehouse': { ar: 'المستودع', en: 'Warehouse' },
  'inv.catJanitorial': { ar: 'مواد النظافة', en: 'Janitorial' },
  'inv.catConsumables': { ar: 'المستهلكات', en: 'Consumables' },
  'inv.noUsage': { ar: 'لا يوجد صرف مسجل', en: 'No usage recorded' },
  'inv.allConsumables': { ar: 'كل المستهلكات', en: 'All consumables' },

  // المشتريات
  'p.title': { ar: 'طلبات الشراء (MRF)', en: 'Purchase Requests (MRF)' },
  'p.new': { ar: 'طلب شراء جديد', en: 'New request' },
  'p.no': { ar: 'رقم الطلب', en: 'No' },
  'p.site': { ar: 'الموقع', en: 'Site' },
  'p.department': { ar: 'القسم', en: 'Department' },
  'p.priority': { ar: 'الأولوية', en: 'Priority' },
  'p.estTotal': { ar: 'الإجمالي التقديري', en: 'Estimated total' },
  'p.waiting': { ar: 'بانتظار', en: 'Waiting for' },
  'p.status': { ar: 'الحالة', en: 'Status' },
  'p.empty': { ar: 'لا توجد طلبات شراء', en: 'No purchase requests' },
  'p.statusPending': { ar: 'قيد الموافقات', en: 'Pending approvals' },
  'p.statusApproved': { ar: 'معتمد', en: 'Approved' },
  'p.statusRejected': { ar: 'مرفوض', en: 'Rejected' },
  'p.priorityNormal': { ar: 'عادي', en: 'Normal' },
  'p.priorityUrgent': { ar: 'عاجل', en: 'Urgent' },
  'p.priorityTop': { ar: 'عاجل جداً', en: 'Top urgent' },

  // نموذج MRF
  'f.title': { ar: 'نموذج طلب مواد / خدمات — MRF', en: 'Materials / Services Requisition — MRF' },
  'f.submit': { ar: 'إرسال الطلب للموافقات', en: 'Submit for approvals' },
  'f.site': { ar: 'الموقع (Site)', en: 'Site' },
  'f.department': { ar: 'القسم (Department) *', en: 'Department *' },
  'f.facility': { ar: 'المنشأة (Facility) *', en: 'Facility *' },
  'f.requiredDate': { ar: 'التاريخ المطلوب (Required Date) *', en: 'Required date *' },
  'f.requestedBy': { ar: 'مقدم الطلب (Requested By) *', en: 'Requested by *' },
  'f.employeeNo': { ar: 'رقم الموظف (Employee)', en: 'Employee no' },
  'f.mrfNo': { ar: 'رقم MRF', en: 'MRF no' },
  'f.autoNo': { ar: 'يُرقّم تلقائياً عند الحفظ', en: 'Auto-numbered on save' },
  'f.priorityLabel': { ar: 'درجة الأولوية:', en: 'Priority:' },
  'f.sn': { ar: 'م', en: 'SN' },
  'f.partNo': { ar: 'رقم القطعة Part No', en: 'Part No' },
  'f.description': { ar: 'الوصف Description', en: 'Description' },
  'f.qty': { ar: 'الكمية Qty', en: 'Qty' },
  'f.uom': { ar: 'الوحدة UOM', en: 'UOM' },
  'f.onHand': { ar: 'المتاح On Hand', en: 'On Hand' },
  'f.estPrice': { ar: 'السعر التقديري (ر.س)', en: 'Est. price (SAR)' },
  'f.remarksRow': { ar: 'ملاحظات Remarks', en: 'Remarks' },
  'f.generalRemarks': { ar: 'ملاحظات عامة (Remarks)', en: 'General remarks' },
  'f.workOrder': { ar: 'أمر العمل (Work Order)', en: 'Work order' },
  'f.woPh': { ar: 'WO-####', en: 'WO-####' },
  'f.ruleTitle': { ar: 'قاعدة عروض الأسعار: أي بند يتجاوز 500 ريال يتطلب إرفاق عرض السعر وموافقة إدارة المشروع', en: 'Quotation rule: any line above SAR 500 requires a quotation attachment and Project Management approval' },
  'f.ruleNeed': { ar: 'توجد بنود تتجاوز 500 ريال — سيتم إضافة «إدارة المشروع» إلى سلسلة الموافقات، ولن يُقبل الطلب دون إرفاق عرض السعر.', en: 'Lines above SAR 500 detected — Project Management will be added to the approval chain, and the request cannot be submitted without a quotation.' },
  'f.ruleOk': { ar: 'جميع البنود ضمن الحد (500 ريال أو أقل) — لا يُطلب عرض سعر.', en: 'All lines are within the limit (SAR 500 or less) — no quotation required.' },
  'f.attached': { ar: '✓ تم إرفاق:', en: '✓ Attached:' },
  'f.errFields': { ar: 'أكمل الحقول المطلوبة: القسم، المنشأة، مقدم الطلب، التاريخ المطلوب', en: 'Complete required fields: department, facility, requested by, required date' },
  'f.errRows': { ar: 'أضف بنداً واحداً على الأقل (رقم قطعة + وصف + كمية)', en: 'Add at least one line (part no + description + qty)' },
  'f.errQuotation': { ar: 'يوجد بند يتجاوز 500 ريال — يجب إرفاق عرض السعر قبل الإرسال', en: 'A line exceeds SAR 500 — a quotation must be attached before submitting' },
  'f.sent': { ar: 'تم إرسال الطلب', en: 'Request submitted' },
  'f.toChain': { ar: 'إلى سلسلة الموافقات', en: 'to the approval chain' },

  // تفاصيل MRF
  'd.estTotal': { ar: 'الإجمالي التقديري:', en: 'Estimated total:' },
  'd.items': { ar: 'البنود المطلوبة', en: 'Requested items' },
  'd.unitPrice': { ar: 'السعر التقديري', en: 'Est. price' },
  'd.lineTotal': { ar: 'الإجمالي', en: 'Total' },
  'd.quotationWarn': { ar: 'ريال — يتطلب عرض سعر وموافقة إدارة المشروع.', en: 'SAR — requires a quotation and Project Management approval.' },
  'd.lineExceeds': { ar: 'هذا الطلب يتضمن', en: 'This request includes' },
  'd.linesExceed': { ar: 'بنود تتجاوز', en: 'lines exceeding' },
  'd.lineExceeds1': { ar: 'بنداً يتجاوز', en: 'line exceeding' },
  'd.quotationFile': { ar: 'عرض السعر المرفق:', en: 'Attached quotation:' },
  'd.noQuotation': { ar: '⚠ لم يُرفق عرض السعر', en: '⚠ No quotation attached' },
  'd.generalRemarks': { ar: 'ملاحظات:', en: 'Remarks:' },
  'd.chain': { ar: 'سلسلة الموافقات والتوقيعات', en: 'Approval & signature chain' },
  'd.step': { ar: 'الموقف', en: 'Step' },
  'd.inChain': { ar: 'في السلسلة', en: 'in chain' },
  'd.extra': { ar: 'إضافي — بند فوق', en: 'Extra — line above' },
  'd.approved': { ar: 'تمت الموافقة', en: 'Approved' },
  'd.rejected': { ar: 'مرفوض', en: 'Rejected' },
  'd.waitingSign': { ar: 'بانتظار التوقيع…', en: 'Awaiting signature…' },
  'd.notYet': { ar: 'لم يحن الدور بعد', en: 'Not yet due' },
  'd.yourTurn': { ar: 'الدور الحالي لك', en: 'It is your turn' },
  'd.signNow': { ar: '— يمكنك التوقيع على الطلب الآن', en: '— you can sign this request now' },
  'd.signNote': { ar: 'ملاحظات التوقيع (اختياري)…', en: 'Signature notes (optional)…' },
  'd.sign': { ar: 'توقيع وموافقة', en: 'Sign & approve' },
  'd.reject': { ar: 'رفض', en: 'Reject' },
  'd.approvedToast': { ar: 'تمت الموافقة بصفتك', en: 'Approved as' },
  'd.rejectedToast': { ar: 'تم رفض الطلب', en: 'Request rejected' },
  'd.waiting': { ar: 'بانتظار توقيع:', en: 'Awaiting signature:' },
  'd.switchHint': { ar: '— غيّر «الدور الحالي» من الأعلى لتجربة التوقيع بصفة صاحب التوقيع.', en: '— switch the "Current role" above to try signing as the signatory.' },
  'd.notFound': { ar: 'الطلب غير موجود.', en: 'Request not found.' },
  'd.back': { ar: 'عودة لطلبات الشراء', en: 'Back to purchase requests' },

  // البيتي كاش
  'pc.title': { ar: 'تقرير البيتي كاش — مشتريات محلية', en: 'Petty Cash Report — Local Purchases' },
  'pc.add': { ar: 'سجل مصروف جديد', en: 'New expense entry' },
  'pc.month': { ar: 'الشهر', en: 'Month' },
  'pc.department': { ar: 'القسم', en: 'Department' },
  'pc.description': { ar: 'وصف الصنف', en: 'Item description' },
  'pc.invoiceNo': { ar: 'رقم الفاتورة', en: 'Invoice no' },
  'pc.unitPrice': { ar: 'سعر الوحدة', en: 'Unit price' },
  'pc.price': { ar: 'الإجمالي قبل الضريبة', en: 'Price excl. VAT' },
  'pc.vat': { ar: 'ض.ق.م 15%', en: 'VAT 15%' },
  'pc.grandTotal': { ar: 'الإجمالي الشهري (شامل الضريبة)', en: 'Monthly total (incl. VAT)' },
  'pc.entries': { ar: 'سجل', en: 'entries' },
  'pc.newEntry': { ar: 'تسجيل مصروف بيتي كاش', en: 'Record petty cash expense' },
  'pc.imported': { ar: 'البيانات المستوردة من ملف PETTY CASH REPORT', en: 'Data imported from PETTY CASH REPORT file' },
  'pc.errFields': { ar: 'أكمل: القسم، الوصف، رقم الفاتورة، والكمية', en: 'Complete: department, description, invoice no and qty' },
  'pc.saved': { ar: 'تم تسجيل المصروف', en: 'Expense recorded' },
  'pc.summary': { ar: 'ملخص', en: 'Summary' },

  // النظافة والمستهلكات
  'st.title.janitorial': { ar: 'مواد النظافة — الخدمات اللينة (Soft Services)', en: 'Janitorial Supplies — Soft Services' },
  'st.title.consumables': { ar: 'المستهلكات وغير القابلة للاسترداد', en: 'Consumable & Non-Reimbursable Items' },
  'st.add': { ar: 'إضافة بند', en: 'Add line' },
  'st.new': { ar: 'إضافة بند جديد', en: 'New line item' },
  'st.airport': { ar: 'المطار', en: 'Airport' },
  'st.section': { ar: 'القسم', en: 'Section' },
  'st.manufacturer': { ar: 'الشركة المصنعة', en: 'Manufacturer' },
  'st.partNo': { ar: 'رقم القطعة', en: 'Part #' },
  'st.receivedQty': { ar: 'الوارد', en: 'Received' },
  'st.usedQty': { ar: 'المستخدم', en: 'Used' },
  'st.actualQty': { ar: 'الفعلي', en: 'Actual' },
  'st.use': { ar: 'صرف', en: 'Issue' },
  'st.useTitle': { ar: 'تسجيل صرف كمية', en: 'Record quantity issue' },
  'st.useQty': { ar: 'الكمية المصروفة', en: 'Issued qty' },
  'st.useFor': { ar: 'جهة الصرف / ملاحظة', en: 'Issued to / note' },
  'st.errQty': { ar: 'الكمية المطلوبة أكبر من المتاح الفعلي', en: 'Requested qty exceeds actual on-hand' },
  'st.usedOk': { ar: 'تم تسجيل الصرف', en: 'Issue recorded' },
  'st.empty': { ar: 'لا توجد بنود', en: 'No line items' },
  'st.imported': { ar: 'البيانات مستوردة من ملف Excel الأصلي', en: 'Data imported from the original Excel file' },
  'st.filterSection': { ar: 'تصفية حسب القسم', en: 'Filter by section' },

  // الدخول والمستخدمون
  'auth.title': { ar: 'تسجيل الدخول', en: 'Sign in' },
  'auth.subtitle': { ar: 'نظام صيانة مطار القيصومة — المجال العربي', en: 'Qaisumah Airport Maintenance — Al Majal Al Arabi' },
  'auth.user': { ar: 'اختر المستخدم', en: 'Select user' },
  'auth.pin': { ar: 'الرقم السري (PIN)', en: 'PIN code' },
  'auth.login': { ar: 'دخول', en: 'Sign in' },
  'auth.error': { ar: 'بيانات الدخول غير صحيحة', en: 'Invalid credentials' },
  'auth.logout': { ar: 'تسجيل الخروج', en: 'Sign out' },
  'auth.welcome': { ar: 'مرحباً', en: 'Welcome' },
  'auth.connecting': { ar: 'جارٍ الاتصال بالخادم…', en: 'Connecting to server…' },
  'auth.offline': { ar: 'غير متصل بالخادم — التغييرات لن تُحفظ', en: 'Offline — changes will not be saved' },

  // لوحة تحكم المستخدمين
  'ad.title': { ar: 'إدارة المستخدمين والصلاحيات', en: 'Users & Permissions' },
  'ad.subtitle': { ar: 'إضافة الأشخاص المعنيين وتحديد صلاحياتهم وبريدهم الرسمي — الصلاحيات تُفرض على الخادم ولا يستطيع أحد تجاوز صلاحية غيره', en: 'Add personnel, assign roles and official emails — permissions are enforced server-side' },
  'ad.add': { ar: 'إضافة مستخدم', en: 'Add user' },
  'ad.edit': { ar: 'تعديل مستخدم', en: 'Edit user' },
  'ad.name': { ar: 'الاسم', en: 'Name' },
  'ad.email': { ar: 'البريد الإلكتروني الرسمي', en: 'Official email' },
  'ad.role': { ar: 'الصلاحية / الدور', en: 'Role' },
  'ad.roleHint': { ar: 'اختر من القائمة أو اكتب مسمى جديداً مثل: مدير ادارة', en: 'Pick from list or type a new title, e.g. Admin Manager' },
  'ad.roleCustomNote': { ar: 'دور مخصص — حدد الصلاحيات يدوياً بالأسفل', en: 'Custom role — set permissions manually below' },
  'ad.pin': { ar: 'الرقم السري', en: 'PIN' },
  'ad.active': { ar: 'نشط', en: 'Active' },
  'ad.delete': { ar: 'حذف', en: 'Delete' },
  'ad.save': { ar: 'حفظ المستخدم', en: 'Save user' },
  'ad.err': { ar: 'أكمل الاسم والبريد والصلاحية', en: 'Complete name, email and role' },
  'ad.roleAdmin': { ar: 'مدير النظام', en: 'System admin' },
  'ad.permTitle': { ar: 'مصفوفة الصلاحيات', en: 'Permission matrix' },
  'ad.permVouchers': { ar: 'تعديل الاستلامات وجداول الصرف', en: 'Edit receipts & issue vouchers' },
  'ad.permItems': { ar: 'إدارة الأصناف', en: 'Manage items' },
  'ad.permPetty': { ar: 'تسجيل البيتي كاش', en: 'Record petty cash' },
  'ad.permStock': { ar: 'صرف النظافة والمستهلكات', en: 'Issue janitorial & consumables' },
  'ad.permUsers': { ar: 'إدارة المستخدمين', en: 'Manage users' },
  'ad.permMrf': { ar: 'إنشاء طلب شراء', en: 'Create MRF' },
  'ad.permCustom': { ar: 'صلاحيات مخصصة (اختياري — تتجاوز صلاحيات الدور)', en: 'Custom permissions (optional — override role defaults)' },
  'ad.permDefault': { ar: 'حسب الدور', en: 'Role default' },
  'ad.permAllow': { ar: 'مسموح', en: 'Allowed' },
  'ad.permDeny': { ar: 'ممنوع', en: 'Denied' },
  'ad.roleDefault': { ar: 'الافتراضي', en: 'Default' },
  'ad.hasCustom': { ar: 'صلاحيات مخصصة', en: 'Custom' },
  'ad.lastAdmin': { ar: 'لا يمكن إلغاء أو حذف آخر مدير للنظام', en: 'Cannot remove the last system admin' },

  // الإشعارات
  'nt.title': { ar: 'الإشعارات', en: 'Notifications' },
  'nt.empty': { ar: 'لا توجد إشعارات', en: 'No notifications' },
  'nt.markRead': { ar: 'تعيين الكل كمقروء', en: 'Mark all read' },

  // التعليقات
  'cm.title': { ar: 'التعليقات والملاحظات', en: 'Comments & notes' },
  'cm.placeholder': { ar: 'اكتب تعليقاً أو طلباً…', en: 'Write a comment or request…' },
  'cm.send': { ar: 'إرسال', en: 'Send' },
  'cm.empty': { ar: 'لا توجد تعليقات بعد — يمكن لأي معني إبداء ملاحظاته هنا', en: 'No comments yet — any concerned person can add notes here' },

  // الطباعة والتصدير
  'pr.print': { ar: 'طباعة / حفظ PDF', en: 'Print / Save PDF' },
  'pr.mrfTitle': { ar: 'MATERIALS REQUISITION FORM', en: 'MATERIALS REQUISITION FORM' },
  'pr.mrfTitleAr': { ar: 'نموذج طلب مواد', en: 'نموذج طلب مواد' },
  'pr.signature': { ar: 'التوقيع', en: 'Signature' },
  'pr.approved': { ar: 'تمت الموافقة', en: 'APPROVED' },
  'pr.pending': { ar: 'بانتظار التوقيع', en: 'PENDING' },
  'pr.rejected': { ar: 'مرفوض', en: 'REJECTED' },
  'pr.approveHint': { ar: 'افتح مربع حفظ PDF في المتصفح لاختيار «حفظ كـ PDF»', en: 'Use the browser print dialog and choose "Save as PDF"' },
  'ex.export': { ar: 'تصدير Excel', en: 'Export Excel' },
  'ex.exporting': { ar: 'جارٍ التصدير…', en: 'Exporting…' },
  'by.label': { ar: 'بواسطة', en: 'By' },

  // رفض الموافقة
  'rj.title': { ar: 'رفض الطلب', en: 'Reject request' },
  'rj.reason': { ar: 'سبب الرفض / الملاحظات (إلزامي)', en: 'Rejection reason / notes (required)' },
  'rj.err': { ar: 'يجب كتابة سبب الرفض أو ملاحظة قبل الرفض', en: 'A rejection reason is required' },
  'rj.hint': { ar: 'سيصل إشعار بالرفض وسببه لجميع المعنيين', en: 'All concerned parties will be notified with the reason' },

  // منع الصلاحيات
  'perm.denied': { ar: 'قراءة فقط — ليست لديك صلاحية التعديل هنا', en: 'Read-only — you do not have edit permission here' },

  // دورة الصرف والاستلام (خصم تلقائي بعد موافقة المستلم)
  'is.title': { ar: 'طلبات الصرف بانتظار موافقة المستلم', en: 'Issue Requests Awaiting Receiver Approval' },
  'is.new': { ar: 'صرف مواد لقسم', en: 'Issue Materials to Department' },
  'is.item': { ar: 'الصنف', en: 'Item' },
  'is.receiver': { ar: 'مستلم المواد (من يوافق على الاستلام)', en: 'Material Receiver (who approves receipt)' },
  'is.dept': { ar: 'القسم المستلم', en: 'Receiving Department' },
  'is.note': { ar: 'ملاحظات الصرف', en: 'Issue notes' },
  'is.request': { ar: 'إرسال طلب الصرف', en: 'Submit Issue Request' },
  'is.sent': { ar: 'تم إرسال طلب الصرف — بانتظار موافقة المستلم', en: 'Issue request sent — awaiting receiver approval' },
  'is.receive': { ar: 'استلام واعتماد الخصم', en: 'Receive & Confirm Deduction' },
  'is.received': { ar: 'تم الاستلام والخصم التلقائي من المخزون', en: 'Received & auto-deducted from stock' },
  'is.empty': { ar: 'لا توجد طلبات صرف معلقة', en: 'No pending issue requests' },
  'is.waiting': { ar: 'بانتظار موافقة المستلم', en: 'Awaiting receiver' },
  'is.done': { ar: 'تم الاستلام', en: 'Received' },
  'is.pendingForMe': { ar: 'بانتظار استلامك وموافقتك', en: 'Awaiting your receipt & approval' },
  'is.moduleOutTitle': { ar: 'سندات صادر مواد النظافة والمستهلكات (معتمدة)', en: 'Approved Janitorial & Consumables Outbound Vouchers' },

  // ===== نظام الصيانة =====
  'nav.assets': { ar: 'الأصول', en: 'Assets' },
  'nav.pm': { ar: 'الصيانة الدورية', en: 'Preventive Maintenance' },
  'nav.cm': { ar: 'الصيانة التصحيحية', en: 'Corrective Maintenance' },
  'nav.depts': { ar: 'الأقسام', en: 'Departments' },
  'ad.permAssets': { ar: 'تعديل سجل الأصول', en: 'Edit assets register' },
  'ad.permOrders': { ar: 'تعديل أوامر الصيانة والبلاغات', en: 'Edit maintenance orders & work orders' },
  'mt.today': { ar: 'اليوم', en: 'Today' },
  'mt.assetsTotal': { ar: 'إجمالي الأصول', en: 'Total Assets' },
  'mt.ordersTotal': { ar: 'إجمالي أوامر الصيانة', en: 'Total Work Orders' },
  'mt.open': { ar: 'أعمال مفتوحة', en: 'Open Work' },
  'mt.overdue': { ar: 'أعمال متأخرة', en: 'Overdue' },
  'mt.completed': { ar: 'أعمال مكتملة', en: 'Completed' },
  'mt.costTotal': { ar: 'إجمالي التكلفة', en: 'Total Cost' },
  'mt.downHours': { ar: 'ساعات التوقف', en: 'Downtime Hours' },
  'mt.overdueList': { ar: 'الأعمال الدورية المتأخرة', en: 'Overdue Preventive Work' },
  'mt.noOverdue': { ar: 'لا توجد أعمال متأخرة', en: 'No overdue work' },
  'mt.byStatus': { ar: 'أوامر العمل حسب الحالة', en: 'Work Orders by Status' },
  'mt.openByDept': { ar: 'الأعمال المفتوحة حسب القسم', en: 'Open Work by Department' },
  'mt.assetNo': { ar: 'رقم الأصل', en: 'Asset No.' },
  'mt.assetName': { ar: 'اسم الأصل', en: 'Asset Name' },
  'mt.dept': { ar: 'القسم', en: 'Department' },
  'mt.location': { ar: 'الموقع بالمطار', en: 'Location' },
  'mt.category': { ar: 'الفئة', en: 'Category' },
  'mt.installDate': { ar: 'تاريخ التشغيل', en: 'Install Date' },
  'mt.criticality': { ar: 'الأهمية', en: 'Criticality' },
  'mt.status': { ar: 'الحالة', en: 'Status' },
  'mt.addAsset': { ar: 'إضافة أصل', en: 'Add Asset' },
  'mt.newAsset': { ar: 'أصل جديد', en: 'New Asset' },
  'mt.editAsset': { ar: 'تعديل أصل', en: 'Edit Asset' },
  'mt.filterDept': { ar: 'تصفية حسب القسم', en: 'Filter by department' },
  'mt.noAssets': { ar: 'لا توجد أصول مسجلة — أضف أول أصل من الزر أعلاه', en: 'No assets yet — add the first asset using the button above' },
  'mt.orderNo': { ar: 'رقم العملية', en: 'Order No.' },
  'mt.task': { ar: 'المهمة', en: 'Task' },
  'mt.freq': { ar: 'التكرار', en: 'Frequency' },
  'mt.tech': { ar: 'الفني', en: 'Technician' },
  'mt.due': { ar: 'تاريخ الاستحقاق القادم', en: 'Next Due Date' },
  'mt.addPm': { ar: 'إضافة عملية', en: 'Add PM Order' },
  'mt.noPm': { ar: 'لا توجد عمليات دورية مسجلة', en: 'No preventive orders yet' },
  'mt.overdueHint': { ar: 'الصفوف الحمراء = أعمال متأخرة عن تاريخ الاستحقاق', en: 'Red rows = overdue work' },
  'mt.fault': { ar: 'وصف العطل', en: 'Fault Description' },
  'mt.priority': { ar: 'الأولوية', en: 'Priority' },
  'mt.addCm': { ar: 'إضافة بلاغ', en: 'Add Work Order' },
  'mt.noCm': { ar: 'لا توجد بلاغات أعطال مسجلة', en: 'No corrective work orders yet' },
  'mt.deptAssets': { ar: 'الأصول', en: 'Assets' },
  'mt.deptPm': { ar: 'صيانة دورية', en: 'PM' },
  'mt.deptCm': { ar: 'صيانة تصحيحية', en: 'CM' },
  'mt.deptCost': { ar: 'التكلفة', en: 'Cost' },
  'mt.deptOpen': { ar: 'أعمال مفتوحة', en: 'Open Work' },
  'mt.readOnly': { ar: 'صلاحياتك الحالية للعرض فقط — التعديل لمدير العمليات والصيانة أو المدير', en: 'Your current access is read-only — editing is for the O&M Superintendent or Admin' },
  'mt.photosBefore': { ar: 'صور العطل (قبل الصيانة)', en: 'Fault photos (before repair)' },
  'mt.photosAfter': { ar: 'صور ما بعد الإنجاز', en: 'Photos after completion' },
  'mt.addPhoto': { ar: 'إضافة صور', en: 'Add photos' },
  'mt.photoHint': { ar: 'يمكن اختيار أكثر من صورة دفعة واحدة — تُضغط تلقائياً قبل الرفع', en: 'Select multiple images at once — auto-compressed before upload' },
  'dash.welcome': { ar: 'أهلاً بك في نظام صيانة مطار القيصومة', en: 'Welcome to Qaisumah Airport Maintenance System' },
  'dash.welcomeSub': { ar: 'المجال العربي — Al Majal Al Arabi (MAG)', en: 'Al Majal Al Arabi (MAG)' },
  'dash.chartsSection': { ar: 'مؤشرات الصيانة الشهرية', en: 'Monthly Maintenance Indicators' },
  'dash.demoBadge': { ar: 'بيانات تجريبية للعرض', en: 'Demo data' },
  'dash.monthlyCompleted': { ar: 'أوامر مكتملة (دورية / تصحيحية)', en: 'Completed orders (PM / CM)' },
  'dash.monthlyCost': { ar: 'التكلفة الشهرية (ر.س)', en: 'Monthly cost (SAR)' },
  'dash.downtimeTrend': { ar: 'ساعات التوقف الشهرية', en: 'Monthly downtime hours' },
  'dash.prioDist': { ar: 'الأعطال حسب الأولوية', en: 'Faults by priority' },
} as const

export type TKey = keyof typeof dict

interface LangCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (k: TKey) => string
  dir: 'rtl' | 'ltr'
}

const Ctx = createContext<LangCtx | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const s = localStorage.getItem('wms-lang')
    return s === 'en' ? 'en' : 'ar'
  })

  // مزامنة لغة تنسيق المبالغ قبل رسم الشاشات — حتى لا تظهر معكوسة عند التبديل الفوري
  setMoneyLang(lang)

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('wms-lang', l)
  }

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.title = lang === 'ar' ? 'مستودع ومشتريات مطار القيصومة' : 'Qaisumah Airport Warehouse & Procurement'
  }, [lang])

  const value = useMemo<LangCtx>(
    () => ({
      lang,
      setLang,
      t: (k) => dict[k][lang],
      dir: lang === 'ar' ? 'rtl' : 'ltr',
    }),
    [lang],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useLang(): LangCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useLang must be used within LanguageProvider')
  return ctx
}

/** ترجمة حسب المفتاح مع دعم العدد */
export function tn(lang: Lang, ar: string, en: string): string {
  return lang === 'ar' ? ar : en
}

/** ترجمة إنجليزية إجبارية — لنموذج طلب المواد الإنجليزي (LTR) */
export function te(k: TKey): string {
  return dict[k].en
}
