'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),  // 문자열에서 숫자로 변환되도록 설정되어 있음.
  status: z.enum(['pending', 'paid']),
  date: z.string(),
});
   
const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  const amountInCents = amount * 100;  // 센트 단위로 변환
  const date = new Date().toISOString().split('T')[0];  // 날짜 "YYYY-MM-DD" 형식

  try {
    // DB에 데이터 삽입
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (error) {
    return {
      message: 'Database Error: Failed to Create Invoice.',
    };
  }

  // Client-side Router Cache
  // 경로 재검증 후 서버에서 새로운 데이터를 가져옴.
  revalidatePath('/dashboard/invoices');
  // redirect
  redirect('/dashboard/invoices');
}


export async function updateInvoice(id: string, formData: FormData) {
  // 데이터 추출, 타입 검증
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
 
  // 센트로 변환
  const amountInCents = amount * 100;
 
  try {
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;
  } catch (error) {
    return { message: 'Database Error: Failed to Update Invoice.' };
  }
 
  // 클라이언트 캐시 지우고 새로운 서버 요청 보냄
  revalidatePath('/dashboard/invoices');
  // redirect
  redirect('/dashboard/invoices');
}


export async function deleteInvoice(id: string) {
  throw new Error('Failed to Delete Invoice');

  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath('/dashboard/invoices');  // 새로운 서버 요청 -> 테이블 재렌더링
    // redirect 호출 필요 x
    return { message: 'Deleted Invoice.' };
  } catch (error) {
    return { message: 'Database Error: Failed to Delete Invoice.' };
  }
}