"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";

const productSchema = z.object({
  title: z.string().trim().min(1, "Tên sản phẩm không được để trống."),
  subtitle: z.string().trim().optional(),
  description: z.string().trim().optional(),
  badgeLabel: z.string().trim().optional(),
  imageUrl: z.string().trim().optional(),
  order: z.coerce.number().int().default(0),
  price: z.coerce.number().int().min(0, "Giá không được âm.").default(0),
  salePrice: z.coerce.number().int().min(0, "Giá khuyến mãi không được âm.").optional(),
  cv: z.coerce.number().int().min(0, "CV không được âm.").default(0),
  // Chỉ điền khi sản phẩm này có trang landing page riêng (xem comment trên
  // Product.slug trong schema.prisma) — để trống với sản phẩm thông thường.
  // Strip leading/trailing "/" — a slug typed as "/sanarey-aria" silently
  // fails the exact-match check in src/app/product/[slug]/page.tsx and 404s.
  slug: z
    .string()
    .trim()
    .transform((v) => v.replace(/^\/+|\/+$/g, ""))
    .optional(),
  lifestyleImage1Url: z.string().trim().optional(),
  lifestyleImage2Url: z.string().trim().optional(),
  lifestyleImage3Url: z.string().trim().optional(),
});

// Sale price is validated against giá gốc here (not in the zod schema
// itself) since the rule spans two fields — same shape as
// admin/courses/actions.ts's resolvePricingFields.
function resolveSalePrice(price: number, salePrice: number | undefined): number | null | string {
  if (!salePrice) return null;
  if (salePrice >= price) return "Giá khuyến mãi phải nhỏ hơn giá gốc.";
  return salePrice;
}

function readProductFormData(formData: FormData) {
  return {
    title: formData.get("title"),
    subtitle: formData.get("subtitle") || undefined,
    description: formData.get("description") || undefined,
    badgeLabel: formData.get("badgeLabel") || undefined,
    imageUrl: formData.get("imageUrl") || undefined,
    order: formData.get("order") || 0,
    price: formData.get("price") || 0,
    salePrice: formData.get("salePrice") || undefined,
    cv: formData.get("cv") || 0,
    slug: formData.get("slug") || undefined,
    lifestyleImage1Url: formData.get("lifestyleImage1Url") || undefined,
    lifestyleImage2Url: formData.get("lifestyleImage2Url") || undefined,
    lifestyleImage3Url: formData.get("lifestyleImage3Url") || undefined,
  };
}

export async function createProductAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireAdminPermission("MANAGE_PRODUCTS");

  const parsed = productSchema.safeParse(readProductFormData(formData));
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  const salePrice = resolveSalePrice(parsed.data.price, parsed.data.salePrice);
  if (typeof salePrice === "string") {
    return salePrice;
  }

  let product;
  try {
    product = await prisma.product.create({
      data: {
        title: parsed.data.title,
        subtitle: parsed.data.subtitle ?? null,
        description: parsed.data.description ?? null,
        badgeLabel: parsed.data.badgeLabel ?? null,
        imageUrl: parsed.data.imageUrl ?? null,
        order: parsed.data.order,
        price: parsed.data.price,
        salePrice,
        cv: parsed.data.cv,
        slug: parsed.data.slug ?? null,
        lifestyleImage1Url: parsed.data.lifestyleImage1Url ?? null,
        lifestyleImage2Url: parsed.data.lifestyleImage2Url ?? null,
        lifestyleImage3Url: parsed.data.lifestyleImage3Url ?? null,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return "Slug này đã được dùng cho sản phẩm khác.";
    }
    throw error;
  }

  revalidatePath("/admin/products");
  redirect(`/admin/products/${product.id}`);
}

const updateProductSchema = productSchema.extend({
  productId: z.string().min(1),
});

export async function updateProductAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireAdminPermission("MANAGE_PRODUCTS");

  const parsed = updateProductSchema.safeParse({
    productId: formData.get("productId"),
    ...readProductFormData(formData),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  const salePrice = resolveSalePrice(parsed.data.price, parsed.data.salePrice);
  if (typeof salePrice === "string") {
    return salePrice;
  }

  const { productId } = parsed.data;
  try {
    await prisma.product.update({
      where: { id: productId },
      data: {
        title: parsed.data.title,
        subtitle: parsed.data.subtitle ?? null,
        description: parsed.data.description ?? null,
        badgeLabel: parsed.data.badgeLabel ?? null,
        imageUrl: parsed.data.imageUrl ?? null,
        order: parsed.data.order,
        price: parsed.data.price,
        salePrice,
        cv: parsed.data.cv,
        slug: parsed.data.slug ?? null,
        lifestyleImage1Url: parsed.data.lifestyleImage1Url ?? null,
        lifestyleImage2Url: parsed.data.lifestyleImage2Url ?? null,
        lifestyleImage3Url: parsed.data.lifestyleImage3Url ?? null,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return "Slug này đã được dùng cho sản phẩm khác.";
    }
    throw error;
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  return undefined;
}

// No redirect — the caller (product list page) just refreshes in place.
export async function deleteProductAction(productId: string) {
  await requireAdminPermission("MANAGE_PRODUCTS");
  await prisma.product.delete({ where: { id: productId } });
  revalidatePath("/admin/products");
}
