import { describe, expect, it } from "vitest";
import { birthdayInputSchema, siteSettingsSchema } from "./validation.js";

describe("birthday input validation", () => {
  it("rejects a lunar day that does not exist in the selected year", () => {
    const result = birthdayInputSchema.safeParse({
      name: "农历校验",
      calendarType: "lunar",
      year: 2026,
      month: 4,
      day: 30,
      isLeapMonth: false,
      displayAge: false,
      visible: true
    });

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.some((issue) => issue.message === "该农历日期在所选年份不存在")
    ).toBe(true);
  });

  it("rejects a leap lunar month that does not exist in the selected year", () => {
    const result = birthdayInputSchema.safeParse({
      name: "闰月校验",
      calendarType: "lunar",
      year: 2026,
      month: 6,
      day: 1,
      isLeapMonth: true,
      leapMonthPolicy: "normalMonthIfNoLeap",
      displayAge: false,
      visible: true
    });

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.some((issue) => issue.message === "该年份没有对应农历闰月")
    ).toBe(true);
  });
});

describe("site settings validation", () => {
  it("accepts practical public-site settings", () => {
    const result = siteSettingsSchema.safeParse({
      siteName: "星星生日墙",
      correctionContact: "发现日期有误请联系管理员。",
      defaultUpcomingDays: 45,
      birthdayGreetingTemplates: ["祝 {names} 生日快乐！"]
    });

    expect(result.success).toBe(true);
  });

  it("rejects an unsafe upcoming window", () => {
    const result = siteSettingsSchema.safeParse({
      siteName: "星星生日墙",
      correctionContact: "",
      defaultUpcomingDays: 400,
      birthdayGreetingTemplates: ["祝 {names} 生日快乐！"]
    });

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.some((issue) => issue.path.join(".") === "defaultUpcomingDays")
    ).toBe(true);
  });

  it("fills default birthday greeting templates", () => {
    const result = siteSettingsSchema.parse({
      siteName: "星星生日墙",
      correctionContact: "发现日期有误请联系管理员。",
      defaultUpcomingDays: 30
    });

    expect(result.birthdayGreetingTemplates).toHaveLength(20);
    expect(result.birthdayGreetingTemplates[0]).toContain("{names}");
  });

  it("rejects empty birthday greeting templates", () => {
    const result = siteSettingsSchema.safeParse({
      siteName: "星星生日墙",
      correctionContact: "发现日期有误请联系管理员。",
      defaultUpcomingDays: 30,
      birthdayGreetingTemplates: []
    });

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.some((issue) => issue.path.join(".") === "birthdayGreetingTemplates")
    ).toBe(true);
  });
});
