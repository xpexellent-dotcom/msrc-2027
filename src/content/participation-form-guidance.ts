import type { Locale } from "@/lib/i18n";

/** ORG-053, 16 October 2026: preserved verbatim EN/AR public rules and preparation
 * copy for future forms; intentionally NOT imported by public rendering code.
 * Future forms must show the applicable guidance before submission.
 * IDs: REG-01/02/07/08, ABS-01/04/07/08/09/10/15, HAC-01–09,
 * TMT-01/02, WKS-01/02/06, CRT-01/02, LOC-01/03, PRV-03.
 * This is a dated wording archive, not authority to open a workflow. */
export const participationFormGuidance = {
  en: {
      registration: { closed: "Registration is not open yet", closedBody: "Registration dates and attendance details will be announced before registration opens.", detailsTitle: "Before you register", details: [
        { title: "A wider community", body: "General attendance is open to students, faculty, healthcare professionals and other interested attendees, including international participants. Competition eligibility is separate." },
        { title: "Start with your account", body: "Create your account and verify your email. You can then reserve your seat when registration opens." },
        { title: "Confirmation by email", body: "We'll email you to confirm your place and send your ticket. Your place is confirmed when you receive that email." },
        { title: "Make time for both days", body: "The full conference certificate requires both day check-ins and the general survey. Workshop certificates have their own completion requirements." },
      ], stepsTitle: "How registration will work", steps: ["Create your account", "Verify your email", "Reserve your seat", "Receive your confirmation email and ticket"], pendingTitle: "A little planning, a clearer visit", pendingBody: "27–28 January 2027 · King Faisal Conference Center, King Abdulaziz University, Jeddah. The registration window will be announced." },
      submissions: { closed: "Research submissions are not open yet", closedBody: "The submission window and final instructions will be published before applications open.", detailsTitle: "Prepare your abstract", details: [
        { title: "Completed or ongoing", body: "Completed studies and work in progress are eligible. Describe your actual results or current progress." },
        { title: "300 body words", body: "Write your scientific content in English. The combined abstract body has a maximum of 300 words, excluding the title, authors, affiliations and keywords." },
        { title: "Two per principal investigator", body: "A principal investigator may have up to two finalized stage-one applications in this edition. Co-authorship alone does not count toward that limit." },
        { title: "Evidence, handled privately", body: "Prepare the applicable ethics or IRB evidence and a similarity report. Do not include patient-identifying information." },
        { title: "Research and attendance", body: "An abstract application does not confirm conference attendance. Listing a co-author does not register them; each attendee registers separately." },
        { title: "Supervisor requirements", body: "A supervisor is required only after selection as a research award winner. Prepare your abstract now and follow the scientific review process when applications open." },
      ], stepsTitle: "Keep your pathways clear", steps: ["Review the submission guidelines", "Prepare an English abstract and required evidence", "Submit when applications open", "Follow the scientific review process"], pendingTitle: "Research and attendance are separate", pendingBody: "An abstract application does not confirm conference attendance. Listing a co-author does not register them. A supervisor is required only after selection as a research award winner." },
      hackathon: { closed: "Hackathon applications are not open yet", closedBody: "Final eligibility, application dates and participation terms will be announced before entries open.", detailsTitle: "Two directions. Your idea.", details: [
        { title: "Translating research into practice", body: "Explore a new idea that connects research with practical healthcare impact." },
        { title: "Advancing medical student research", body: "Explore a new idea that helps medical student research move forward." },
        { title: "Solo or together", body: "Enter independently or as a preformed team of up to five. Cross-university teams are allowed; there is no automatic team matching." },
        { title: "An idea and a pitch", body: "Prepare an English title and a pitch of up to 300 words. New ideas are required. A prototype is encouraged and optional." },
        { title: "From preparation to presentation", body: "Take part in preparation and compulsory orientation, then day-one mentoring and day-two pitch and judging." },
        { title: "Your next steps", body: "Final eligibility, membership rules, application deadlines, fees, prizes and terms are to be announced. Conference registration is separate from your hackathon entry." },
      ], stepsTitle: "From preparation to presentation", steps: ["Preparation and compulsory orientation", "Day-one mentoring", "Day-two pitch and judging"], pendingTitle: "The next details are on their way", pendingBody: "Final eligibility, membership rules, application deadlines, fees, prizes and terms are to be announced. Hackathon participation and conference registration are separate." },
      workshops: { closed: "Workshop booking is not open yet", closedBody: "The workshop catalogue, booking dates and prices will be announced before bookings open.", detailsTitle: "Make space for practical learning", details: [
        { title: "Browse before you book", body: "Workshop information will be open to everyone. Review the requirements, instructor, time and room before choosing a workshop." },
        { title: "A separate booking", body: "Book each workshop with your confirmed conference registration. We'll email you to confirm your workshop place." },
        { title: "Choose a workable day", body: "You may attend more than one workshop when their times do not overlap. Availability will be shown for each confirmed workshop." },
        { title: "Your workshop certificate", body: "Workshop certificate eligibility requires a confirmed booking, workshop check-in, completion confirmation and the workshop survey. It is separate from the full conference certificate." },
      ], stepsTitle: "How booking will work", steps: ["Choose a workshop", "Book it with your confirmed conference registration", "Receive your confirmation email"], pendingTitle: "Know what your certificate requires", pendingBody: "Workshop certificate eligibility requires a confirmed booking, workshop check-in, completion confirmation and the workshop survey. It is separate from the full conference certificate." },
      threeMinuteThesis: { closed: "3MT applications are not open yet", closedBody: "Eligibility, entry requirements and the application window will be announced before entries open.", detailsTitle: "A distinct research pathway", details: [{ title: "Postgraduate research", body: "3MT has its own application and assessment process, separate from abstracts and the hackathon." }, { title: "Clear communication", body: "Scientific submission content is in English. Final competition instructions will be published here." }], stepsTitle: "Prepare for the next announcement", steps: ["Review the confirmed competition guidelines when published", "Apply through the separate 3MT pathway when it opens"], pendingTitle: "Details to be announced", pendingBody: "Final eligibility, deadlines, presentation rules and awards require confirmation. Conference attendance has its own registration process." },
  },
  ar: {
      registration: { closed: "لم يُفتح التسجيل بعد", closedBody: "ستُعلن مواعيد التسجيل وتفاصيل الحضور قبل فتح التسجيل.", detailsTitle: "قبل التسجيل", details: [
        { title: "مجتمع أوسع", body: "الحضور العام متاح للطلاب وأعضاء هيئة التدريس والممارسين الصحيين وغيرهم من المهتمين، بمن فيهم المشاركون الدوليون. أهلية المسابقات مستقلة." },
        { title: "ابدأ بحسابك", body: "أنشئ حسابك وتحقّق من بريدك الإلكتروني. يمكنك بعدها حجز مقعدك عند فتح التسجيل." },
        { title: "التأكيد عبر البريد الإلكتروني", body: "سنرسل إليك رسالة لتأكيد مقعدك وإرسال تذكرتك. يتأكد مقعدك عند استلام هذه الرسالة." },
        { title: "خصص وقتًا لكلا اليومين", body: "تتطلب شهادة حضور المؤتمر كاملًا تسجيل الحضور في اليومين وإكمال الاستبيان العام. لشهادات ورش العمل متطلبات إتمام مستقلة." },
      ], stepsTitle: "كيف سيتم التسجيل", steps: ["أنشئ حسابك", "تحقّق من بريدك الإلكتروني", "احجز مقعدك", "استلم رسالة تأكيد التسجيل وتذكرتك"], pendingTitle: "خطّط لزيارتك", pendingBody: "٢٧–٢٨ يناير ٢٠٢٧ · مركز الملك فيصل للمؤتمرات، جامعة الملك عبدالعزيز، جدة. ستُعلن فترة التسجيل لاحقًا." },
      submissions: { closed: "لم يُفتح تقديم الأبحاث بعد", closedBody: "ستُنشر فترة التقديم والإرشادات النهائية قبل فتح الطلبات.", detailsTitle: "جهّز ملخصك البحثي", details: [
        { title: "مكتمل أو جارٍ", body: "الأبحاث المكتملة والجارية مؤهلة. صف نتائجك الفعلية أو التقدم الحالي للعمل." },
        { title: "٣٠٠ كلمة للمحتوى", body: "اكتب المحتوى العلمي بالإنجليزية. الحد الأقصى لمجموع محتوى الملخص ٣٠٠ كلمة، دون العنوان والمؤلفين والانتماءات والكلمات المفتاحية." },
        { title: "طلبان لكل باحث رئيسي", body: "لكل باحث رئيسي طلبان نهائيان كحد أقصى في المرحلة الأولى لهذه النسخة. المشاركة كمؤلف فقط لا تُحتسب ضمن هذا الحد." },
        { title: "وثائق محفوظة بسرية", body: "جهّز الأدلة الأخلاقية أو موافقة لجنة أخلاقيات البحث عند انطباقها وتقرير التشابه. لا تُدرج معلومات تكشف هوية المرضى." },
        { title: "البحث والحضور", body: "طلب تقديم الملخص لا يؤكد حضور المؤتمر. إدراج مؤلف مشارك لا يسجّله للحضور؛ يسجّل كل حاضر بشكل مستقل." },
        { title: "متطلبات المشرف", body: "يُطلب المشرف فقط بعد اختيار الفائز بجائزة بحثية. جهّز ملخصك الآن وتابع إجراءات المراجعة العلمية عند فتح الطلبات." },
      ], stepsTitle: "مسارات واضحة ومستقلة", steps: ["راجع إرشادات التقديم", "جهّز ملخصًا بالإنجليزية والوثائق المطلوبة", "قدّم عند فتح الطلبات", "تابع إجراءات المراجعة العلمية"], pendingTitle: "البحث والحضور مساران منفصلان", pendingBody: "طلب تقديم الملخص لا يؤكد حضور المؤتمر. إدراج مؤلف مشارك لا يسجّله للحضور. يُطلب المشرف فقط بعد اختيار الفائز بجائزة بحثية." },
      hackathon: { closed: "لم يُفتح التقديم للهاكاثون بعد", closedBody: "ستُعلن الأهلية النهائية ومواعيد التقديم وشروط المشاركة قبل فتح الطلبات.", detailsTitle: "مساران. وفكرتك.", details: [
        { title: "Translating research into practice", body: "استكشف فكرة جديدة تربط البحث بأثر عملي في الرعاية الصحية." },
        { title: "Advancing medical student research", body: "استكشف فكرة جديدة تسهم في تطوير البحث لدى طلاب الطب." },
        { title: "بمفردك أو ضمن فريق", body: "شارك مستقلًا أو ضمن فريق مُشكّل مسبقًا من خمسة أعضاء كحد أقصى. يمكن تشكيل فرق من جامعات مختلفة؛ لا توجد مطابقة تلقائية للفرق." },
        { title: "فكرة وعرض موجز", body: "جهّز عنوانًا وعرضًا موجزًا بالإنجليزية لا يتجاوز ٣٠٠ كلمة. تُقبل الأفكار الجديدة فقط. يُستحسن تقديم نموذج أولي، وهو اختياري." },
        { title: "من الإعداد إلى العرض", body: "شارك في التحضير والتهيئة الإلزامية، ثم الإرشاد في اليوم الأول والعرض والتحكيم في اليوم الثاني." },
        { title: "خطواتك التالية", body: "ستُعلن الأهلية النهائية وقواعد العضوية والمواعيد والرسوم والجوائز والشروط لاحقًا. التسجيل لحضور المؤتمر مستقل عن طلب الهاكاثون." },
      ], stepsTitle: "من الإعداد إلى العرض", steps: ["التحضير والتهيئة الإلزامية", "الإرشاد في اليوم الأول", "العرض والتحكيم في اليوم الثاني"], pendingTitle: "المزيد من التفاصيل قريبًا", pendingBody: "ستُعلن الأهلية النهائية وقواعد العضوية ومواعيد التقديم والرسوم والجوائز والشروط لاحقًا. الهاكاثون والتسجيل لحضور المؤتمر مساران منفصلان." },
      workshops: { closed: "لم يُفتح حجز ورش العمل بعد", closedBody: "ستُعلن قائمة الورش ومواعيد الحجز والأسعار قبل فتح الحجوزات.", detailsTitle: "مساحة للتعلّم العملي", details: [
        { title: "استكشف قبل الحجز", body: "ستكون معلومات الورش متاحة للجميع. راجع المتطلبات والمدرب والوقت والقاعة قبل اختيار الورشة." },
        { title: "حجز مستقل", body: "احجز كل ورشة بعد تأكيد تسجيلك في المؤتمر. سنرسل إليك رسالة لتأكيد مقعدك في الورشة." },
        { title: "اختر يومًا مناسبًا", body: "يمكن حضور أكثر من ورشة عندما لا تتداخل أوقاتها. ستظهر الإتاحة لكل ورشة معتمدة." },
        { title: "شهادة ورشة العمل", body: "تتطلب أهلية الشهادة حجزًا مؤكدًا وتسجيل حضور الورشة وتأكيد إتمامها واستبيان الورشة. وهي مستقلة عن شهادة حضور المؤتمر كاملًا." },
      ], stepsTitle: "كيف سيتم الحجز", steps: ["اختر ورشة عمل", "احجزها بعد تأكيد تسجيلك في المؤتمر", "استلم رسالة تأكيد الحجز"], pendingTitle: "متطلبات شهادة ورشة العمل", pendingBody: "تتطلب أهلية الشهادة حجزًا مؤكدًا وتسجيل حضور الورشة وتأكيد إتمامها واستبيان الورشة. وهي مستقلة عن شهادة حضور المؤتمر كاملًا." },
      threeMinuteThesis: { closed: "لم يُفتح التقديم لمسابقة 3MT بعد", closedBody: "ستُعلن الأهلية ومتطلبات المشاركة وفترة التقديم قبل فتح الطلبات.", detailsTitle: "مسار بحثي مستقل", details: [{ title: "أبحاث الدراسات العليا", body: "للمسابقة إجراءات تقديم وتقييم خاصة بها، منفصلة عن الملخصات والهاكاثون." }, { title: "تواصل واضح", body: "يُقدّم المحتوى العلمي بالإنجليزية. ستُنشر الإرشادات النهائية للمسابقة هنا." }], stepsTitle: "استعد للإعلان القادم", steps: ["راجع إرشادات المسابقة المعتمدة عند نشرها", "قدّم عبر مسار 3MT المستقل عند فتحه"], pendingTitle: "تفاصيل ستُعلن لاحقًا", pendingBody: "الأهلية النهائية والمواعيد وقواعد العرض والجوائز بانتظار التأكيد. حضور المؤتمر له إجراءات تسجيل مستقلة." },
  },
} satisfies Record<Locale, unknown>;
