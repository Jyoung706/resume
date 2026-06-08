import { useDataViewStore } from "@/logic/common/chat/stores/dataViewStore";
import { downloadAsCSV } from "@/logic/shared/utils/csvExport";
import { DataViewModal } from "@/components/domain/DataViewModal";

export function DataViewModalConnector() {
  const { isOpen, columns, data, title, isLoading, closeDataView } =
    useDataViewStore();

  if (!isOpen) return null;

  const handleCsvDownload = () => {
    downloadAsCSV(data, columns);
  };

  return (
    <DataViewModal
      open={isOpen}
      onClose={closeDataView}
      columns={columns}
      data={data}
      title={title}
      isLoading={isLoading}
      onCsvDownload={handleCsvDownload}
    />
  );
}
