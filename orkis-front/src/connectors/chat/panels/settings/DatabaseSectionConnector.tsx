// ============================================
// DatabaseSectionConnector — 데이터베이스 섹션 커넥터
// 소유 훅: useDbConnectionCrud, useDbSchemaViewer, useDbSelectionStore
// 렌더링: DatabaseList + DbConnectionWizard + DbConnectionEditDialog
//         + 삭제 ConfirmModal + DbSchemaDialog
// ============================================

import { useEffect } from "react";
import { ConfirmModal } from "@/components";
import { useDbSelectionStore } from "@/logic/common/db/dbSelectionStore";
import { useDbConnectionCrud } from "@/logic/chat/panels/settings/useDbConnectionCrud";
import { useDbSchemaViewer } from "@/logic/chat/panels/settings/useDbSchemaViewer";
import { DatabaseList } from "@/pages/chat/panels/settings/DatabaseSection";
import { DbConnectionWizard, DbConnectionEditDialog } from "@/pages/chat/panels/settings/DatabaseSection";
import { DbSchemaDialog } from "@/pages/chat/panels/settings/DatabaseSection/DbSchemaDialog";

export function DatabaseSectionConnector() {
  const dbConnections = useDbSelectionStore((s) => s.dbConnections);
  const refreshDbConnections = useDbSelectionStore((s) => s.refreshDbConnections);
  const dbCrud = useDbConnectionCrud();
  const schemaViewer = useDbSchemaViewer();

  useEffect(() => {
    refreshDbConnections();
  }, []);

  const handleWizardViewSchema = () => {
    const conn = dbCrud.wizard.createdConnection;
    if (conn) schemaViewer.dialog.openDialog(conn);
  };

  return (
    <>
      {/* ── DB 연결 리스트 ── */}
      <DatabaseList
        dbConnections={dbConnections}
        onAddClick={dbCrud.wizard.openWizard}
        onEditClick={dbCrud.edit.openEditDialog}
        onDeleteClick={dbCrud.delete.openDeleteConfirm}
        onViewSchemaClick={schemaViewer.dialog.openDialog}
      />

      {/* ── DB 등록 위자드 ── */}
      <DbConnectionWizard
        open={dbCrud.wizard.open}
        onClose={dbCrud.wizard.closeWizard}
        step={dbCrud.wizard.step}
        onSetStep={dbCrud.wizard.setStep}
        dbTypes={dbCrud.wizard.dbTypes}
        loadingDbTypes={dbCrud.wizard.loadingDbTypes}
        selectedDbType={dbCrud.wizard.selectedDbType}
        onSelectDbType={dbCrud.wizard.selectDbType}
        formData={dbCrud.wizard.formData}
        onFormChange={dbCrud.wizard.setFormField}
        fieldErrors={dbCrud.wizard.fieldErrors}
        testResult={dbCrud.wizard.testResult}
        testing={dbCrud.wizard.testing}
        onTest={dbCrud.wizard.handleTest}
        saving={dbCrud.wizard.saving}
        onSave={dbCrud.wizard.handleSave}
        onCreateSqlite={dbCrud.wizard.handleCreateSqlite}
        sqliteCreating={dbCrud.wizard.sqliteCreating}
        sqliteCreated={dbCrud.wizard.sqliteCreated}
        createdConnection={dbCrud.wizard.createdConnection}
        onViewSchema={handleWizardViewSchema}
        ragReadiness={dbCrud.wizard.ragReadiness}
        ragConfirmOpen={dbCrud.wizard.ragConfirmOpen}
        existingRagInfo={dbCrud.wizard.existingRagInfo}
        onComplete={dbCrud.wizard.handleComplete}
        onRagConfirm={dbCrud.wizard.handleRagConfirm}
        onRagSkip={dbCrud.wizard.handleRagSkip}
        isSampleDb={dbCrud.wizard.formData.sqliteOption === "sample"}
      />

      {/* ── DB 수정 다이얼로그 ── */}
      <DbConnectionEditDialog
        open={dbCrud.edit.open}
        onClose={dbCrud.edit.closeEditDialog}
        connection={dbCrud.edit.connection}
        formData={dbCrud.edit.formData}
        onFormChange={dbCrud.edit.setFormField}
        fieldErrors={dbCrud.edit.fieldErrors}
        testResult={dbCrud.edit.testResult}
        testing={dbCrud.edit.testing}
        onTest={dbCrud.edit.handleTest}
        saving={dbCrud.edit.saving}
        loadingDetail={dbCrud.edit.loadingDetail}
        onUpdate={dbCrud.edit.handleUpdate}
        onDelete={() => {
          if (dbCrud.edit.connection) {
            dbCrud.edit.closeEditDialog();
            dbCrud.delete.openDeleteConfirm({
              connectionId: dbCrud.edit.connection.connectionId,
              connectionName: dbCrud.edit.connection.connectionName,
              dbTypeId: dbCrud.edit.connection.dbTypeId,
            } as any);
          }
        }}
      />

      {/* ── DB 삭제 확인 다이얼로그 ── */}
      <ConfirmModal
        open={dbCrud.delete.open}
        onClose={dbCrud.delete.closeDeleteConfirm}
        title="데이터베이스 연결 삭제"
        message={dbCrud.delete.connection
          ? `"${dbCrud.delete.connection.connectionName}" 연결을 삭제하시겠습니까?\n\n• 해당 DB의 SQL 조회 결과를 더 이상 조회할 수 없습니다\n• 해당 DB의 RAG 전처리 데이터가 삭제됩니다\n• 실제 데이터베이스 파일(원본)은 삭제되지 않습니다`
          : ""}
        confirmText="삭제"
        cancelText="취소"
        confirmColor="error"
        onConfirm={dbCrud.delete.handleDelete}
      />

      {/* ── DB 스키마 관리 다이얼로그 ── */}
      <DbSchemaDialog
        open={schemaViewer.dialog.open}
        onClose={schemaViewer.dialog.closeDialog}
        connectionName={schemaViewer.dialog.connectionName}
        databaseName={schemaViewer.dialog.databaseName}
        dbTypeName={schemaViewer.dialog.dbTypeName}
        loading={schemaViewer.dialog.loading}
        error={schemaViewer.dialog.error}
        tables={schemaViewer.dialog.tables}
        selectedTable={schemaViewer.dialog.selectedTable}
        columns={schemaViewer.dialog.columns}
        sampleData={schemaViewer.dialog.sampleData}
        totalRows={schemaViewer.dialog.totalRows}
        detailLoading={schemaViewer.dialog.detailLoading}
        tableSearchTerm={schemaViewer.dialog.tableSearchTerm}
        columnSearchTerm={schemaViewer.dialog.columnSearchTerm}
        onTableClick={schemaViewer.dialog.handleTableClick}
        onTableSearchChange={schemaViewer.dialog.setTableSearchTerm}
        onColumnSearchChange={schemaViewer.dialog.setColumnSearchTerm}
        addTableOpen={schemaViewer.tableCrud.addOpen}
        newTableName={schemaViewer.tableCrud.newTableName}
        newTableComment={schemaViewer.tableCrud.newTableComment}
        newTableColumns={schemaViewer.tableCrud.newTableColumns}
        addTableSaving={schemaViewer.tableCrud.addSaving}
        onOpenAddTable={schemaViewer.tableCrud.openAddTable}
        onCloseAddTable={schemaViewer.tableCrud.closeAddTable}
        onSetNewTableName={schemaViewer.tableCrud.setNewTableName}
        onSetNewTableComment={schemaViewer.tableCrud.setNewTableComment}
        onAddNewTableColumn={schemaViewer.tableCrud.addNewTableColumn}
        onRemoveNewTableColumn={schemaViewer.tableCrud.removeNewTableColumn}
        onUpdateNewTableColumn={schemaViewer.tableCrud.updateNewTableColumn}
        onAddTable={schemaViewer.tableCrud.handleAddTable}
        editTableOpen={schemaViewer.tableCrud.editOpen}
        editTableName={schemaViewer.tableCrud.editTableName}
        editTableSaving={schemaViewer.tableCrud.editSaving}
        onOpenEditTable={schemaViewer.tableCrud.openEditTable}
        onCloseEditTable={schemaViewer.tableCrud.closeEditTable}
        onSetEditTableName={schemaViewer.tableCrud.setEditTableName}
        onEditTable={schemaViewer.tableCrud.handleEditTable}
        deleteTableOpen={schemaViewer.tableCrud.deleteOpen}
        deleteTableName={schemaViewer.tableCrud.deleteTableName}
        deleteTableDeleting={schemaViewer.tableCrud.deleting}
        onOpenDeleteTable={schemaViewer.tableCrud.openDeleteTable}
        onCloseDeleteTable={schemaViewer.tableCrud.closeDeleteTable}
        onDeleteTable={schemaViewer.tableCrud.handleDeleteTable}
        addColumnOpen={schemaViewer.columnCrud.addOpen}
        newColumnName={schemaViewer.columnCrud.newColumnName}
        newColumnDataType={schemaViewer.columnCrud.newColumnDataType}
        newColumnIsNullable={schemaViewer.columnCrud.newColumnIsNullable}
        newColumnIsPrimaryKey={schemaViewer.columnCrud.newColumnIsPrimaryKey}
        newColumnDefaultValue={schemaViewer.columnCrud.newColumnDefaultValue}
        newColumnComment={schemaViewer.columnCrud.newColumnComment}
        addColumnSaving={schemaViewer.columnCrud.addSaving}
        onOpenAddColumn={schemaViewer.columnCrud.openAddColumn}
        onCloseAddColumn={schemaViewer.columnCrud.closeAddColumn}
        onSetNewColumnName={schemaViewer.columnCrud.setNewColumnName}
        onSetNewColumnDataType={schemaViewer.columnCrud.setNewColumnDataType}
        onSetNewColumnIsNullable={schemaViewer.columnCrud.setNewColumnIsNullable}
        onSetNewColumnIsPrimaryKey={schemaViewer.columnCrud.setNewColumnIsPrimaryKey}
        onSetNewColumnDefaultValue={schemaViewer.columnCrud.setNewColumnDefaultValue}
        onSetNewColumnComment={schemaViewer.columnCrud.setNewColumnComment}
        onAddColumn={schemaViewer.columnCrud.handleAddColumn}
        editColumnOpen={schemaViewer.columnCrud.editOpen}
        editColumnName={schemaViewer.columnCrud.editColumnName}
        editColumnSaving={schemaViewer.columnCrud.editSaving}
        onOpenEditColumn={schemaViewer.columnCrud.openEditColumn}
        onCloseEditColumn={schemaViewer.columnCrud.closeEditColumn}
        onSetEditColumnName={schemaViewer.columnCrud.setEditColumnName}
        onEditColumn={schemaViewer.columnCrud.handleEditColumn}
        deleteColumnOpen={schemaViewer.columnCrud.deleteOpen}
        deleteColumnName={schemaViewer.columnCrud.deleteColumnName}
        deleteColumnDeleting={schemaViewer.columnCrud.deleting}
        onOpenDeleteColumn={schemaViewer.columnCrud.openDeleteColumn}
        onCloseDeleteColumn={schemaViewer.columnCrud.closeDeleteColumn}
        onDeleteColumn={schemaViewer.columnCrud.handleDeleteColumn}
        insertDataOpen={schemaViewer.dataInsert.open}
        insertDataValues={schemaViewer.dataInsert.values}
        insertDataSaving={schemaViewer.dataInsert.saving}
        onOpenInsertData={schemaViewer.dataInsert.openInsertData}
        onCloseInsertData={schemaViewer.dataInsert.closeInsertData}
        onSetInsertDataValue={schemaViewer.dataInsert.setValue}
        onInsertData={schemaViewer.dataInsert.handleInsert}
      />
    </>
  );
}
