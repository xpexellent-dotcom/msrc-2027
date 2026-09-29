import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FormField } from "@/components/forms/form-field";
import { Select } from "@/components/forms/select";
import { Checkbox } from "@/components/forms/checkbox";
import { Radio } from "@/components/forms/radio";
import { FileUpload } from "@/components/forms/file-upload";

describe("form accessibility and language contracts (LOC-01/02, ACC-01)", () => {
  it("keeps an Arabic scientific label while the value is English/LTR and all guidance is associated", () => {
    const html = renderToStaticMarkup(createElement(FormField, {
      id: "scientific-title", label: "عنوان تجريبي", hint: "English scientific content", error: "Enter a title",
      success: "Should not be announced", required: true, scientific: true, lang: "ar", dir: "rtl",
      "aria-describedby": "general-guidance",
    }));
    expect(html).toContain('for="scientific-title"');
    expect(html).toContain("عنوان تجريبي");
    expect(html).toContain('lang="en"');
    expect(html).toContain('dir="ltr"');
    expect(html).toContain('aria-describedby="general-guidance scientific-title-hint scientific-title-error"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('id="scientific-title-error"');
    expect(html).toContain('required=""');
    expect(html).not.toContain("Should not be announced");
  });

  it("uses a native select and disables input while options are loading", () => {
    const html = renderToStaticMarkup(createElement(Select, {
      id: "example-select", label: "خيار تجريبي", loading: true, loadingLabel: "جارٍ التحميل", defaultValue: "sample",
    }, createElement("option", { value: "sample" }, "نموذج")));
    expect(html).toContain("<select");
    expect(html).toContain('disabled=""');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-describedby="example-select-loading"');
    expect(html).toContain('id="example-select-loading"');
    expect(html).toContain('role="status"');
    expect(html).toContain('value="sample" selected=""');
  });

  it("associates checkbox errors with the native required control", () => {
    const html = renderToStaticMarkup(createElement(Checkbox, {
      id: "choice", label: "Synthetic choice", error: "Choose this option", required: true,
    }));
    expect(html).toContain('<label class="choice-label" for="choice">');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('required=""');
    expect(html).toContain('aria-describedby="choice-error"');
    expect(html).toContain('aria-invalid="true"');
  });

  it("preserves native radio grouping and selected values", () => {
    const html = renderToStaticMarkup(createElement(Radio, {
      id: "radio-one", label: "Synthetic first option", name: "synthetic-group", value: "one", defaultChecked: true,
    }));
    expect(html).toContain('type="radio"');
    expect(html).toContain('name="synthetic-group"');
    expect(html).toContain('value="one"');
    expect(html).toContain('checked=""');
  });

  it("keeps file requirements caller-owned and initializes without claiming a selected or uploaded file", () => {
    const html = renderToStaticMarkup(createElement(FileUpload, {
      id: "file", label: "ملف تجريبي", hint: "No upload occurs", clearLabel: "مسح الاختيار", selectionLabel: "الاختيار:",
    }));
    expect(html).toContain('type="file"');
    expect(html).toContain('aria-describedby="file-hint"');
    expect(html).toContain("No upload occurs");
    expect(html).not.toContain("accept=");
    expect(html).not.toContain("required=");
    expect(html).not.toContain("<button");
  });
});
