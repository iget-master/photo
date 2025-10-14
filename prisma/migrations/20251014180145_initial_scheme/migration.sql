-- CreateEnum
CREATE TYPE "PhotoStatus" AS ENUM ('NEW', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CARD');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "hashedPassword" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Album" (
    "id" TEXT NOT NULL,
    "photographerId" TEXT NOT NULL,
    "albumName" TEXT NOT NULL,
    "pricePerPhotoCents" INTEGER NOT NULL,
    "coverPhotoUrl" TEXT,
    "visitCount" INTEGER NOT NULL DEFAULT 0,
    "soldPhotos" INTEGER NOT NULL DEFAULT 0,
    "totalSoldValueCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Album_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "albumId" TEXT,
    "url" TEXT NOT NULL,
    "originalName" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "PhotoStatus" NOT NULL DEFAULT 'NEW',
    "processingAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "publicId" TEXT,
    "urlWatermark" TEXT,
    "urlThumb" TEXT,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "customerCpf" TEXT,
    "customerEmail" TEXT,
    "totalCents" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'PIX',
    "pixTxId" TEXT,
    "pixPayload" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Photo_publicId_key" ON "Photo"("publicId");

-- CreateIndex
CREATE INDEX "Photo_albumId_createdAt_idx" ON "Photo"("albumId", "createdAt");

-- CreateIndex
CREATE INDEX "Photo_createdAt_idx" ON "Photo"("createdAt");

-- AddForeignKey
ALTER TABLE "Album" ADD CONSTRAINT "Album_photographerId_fkey" FOREIGN KEY ("photographerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
