-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'PHARMACIST',
    "passwordHash" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PharmacySettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pharmacyName" TEXT NOT NULL,
    "tagline" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "clinicianName" TEXT,
    "expiryAlertDays" INTEGER NOT NULL DEFAULT 90,
    "reorderAlertLevel" INTEGER NOT NULL DEFAULT 10,
    "logoUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Drug" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "genericName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "formulation" TEXT NOT NULL,
    "batchNo" TEXT NOT NULL,
    "manufactureDate" DATETIME,
    "expiryDate" DATETIME NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "buyingPrice" REAL NOT NULL,
    "sellingPrice" REAL NOT NULL,
    "markupPercent" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_STOCK',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "age" INTEGER,
    "gender" TEXT,
    "address" TEXT,
    "allergies" TEXT,
    "totalVisits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DispenseTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transactionNo" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "patientType" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "phone" TEXT,
    "clinicianName" TEXT NOT NULL,
    "prescriptionDate" DATETIME,
    "diagnosis" TEXT,
    "subtotal" REAL NOT NULL,
    "discount" REAL NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "cashTendered" REAL,
    "changeAmount" REAL,
    "mpesaCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "patientId" TEXT,
    "userId" TEXT,
    CONSTRAINT "DispenseTransaction_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DispenseTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PrescriptionItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "drugId" TEXT NOT NULL,
    "drugCode" TEXT NOT NULL,
    "drugName" TEXT NOT NULL,
    "batchNo" TEXT NOT NULL,
    "expiryDate" DATETIME NOT NULL,
    "availableQty" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitPrice" REAL NOT NULL,
    "frequency" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "durationUnit" TEXT NOT NULL,
    "specialInstructions" TEXT,
    "lineTotal" REAL NOT NULL,
    "transactionId" TEXT NOT NULL,
    CONSTRAINT "PrescriptionItem_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "DispenseTransaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PrescriptionItem_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "Drug" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockAdjustment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "drugId" TEXT NOT NULL,
    "drugName" TEXT NOT NULL,
    "batchNo" TEXT NOT NULL,
    "previousQty" INTEGER NOT NULL,
    "adjustedQty" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "adjustedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    CONSTRAINT "StockAdjustment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Drug_code_key" ON "Drug"("code");

-- CreateIndex
CREATE INDEX "Patient_phone_idx" ON "Patient"("phone");

-- CreateIndex
CREATE INDEX "Patient_name_idx" ON "Patient"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DispenseTransaction_transactionNo_key" ON "DispenseTransaction"("transactionNo");

-- CreateIndex
CREATE INDEX "DispenseTransaction_date_idx" ON "DispenseTransaction"("date");

-- CreateIndex
CREATE INDEX "DispenseTransaction_patientId_idx" ON "DispenseTransaction"("patientId");

-- CreateIndex
CREATE INDEX "PrescriptionItem_drugId_idx" ON "PrescriptionItem"("drugId");

-- CreateIndex
CREATE INDEX "PrescriptionItem_transactionId_idx" ON "PrescriptionItem"("transactionId");

-- CreateIndex
CREATE INDEX "StockAdjustment_drugId_idx" ON "StockAdjustment"("drugId");

-- CreateIndex
CREATE INDEX "StockAdjustment_date_idx" ON "StockAdjustment"("date");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_idx" ON "AuditLog"("entity");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
