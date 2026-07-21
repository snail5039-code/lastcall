import AsyncStorage from "@react-native-async-storage/async-storage";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type PersonInfo = {
  relation: string;
  name: string;
  birth: string;
  gender: string;
  bloodType: string;
  disease: string;
  medicine: string;
  allergy: string;
  guardianName: string;
  guardianPhone: string;
  memo: string;
};

const emptyPerson: PersonInfo = {
  relation: "",
  name: "",
  birth: "",
  gender: "",
  bloodType: "",
  disease: "",
  medicine: "",
  allergy: "",
  guardianName: "",
  guardianPhone: "",
  memo: "",
};

export default function MyInfoScreen() {
  const [personList, setPersonList] = useState<PersonInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [relation, setRelation] = useState("");
  const [name, setName] = useState("");
  const [birth, setBirth] = useState("");
  const [gender, setGender] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [disease, setDisease] = useState("");
  const [medicine, setMedicine] = useState("");
  const [allergy, setAllergy] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [memo, setMemo] = useState("");

  useEffect(() => {
    loadPersonList();
  }, []);

  const loadPersonList = async () => {
    try {
      const savedList = await AsyncStorage.getItem("myInfoList");

      if (savedList) {
        const parsedList: PersonInfo[] = JSON.parse(savedList);
        setPersonList(parsedList);
        setSelectedIndex(0);
        setIsEditMode(false);
        return;
      }

      const oldMyInfo = await AsyncStorage.getItem("myInfo");

      if (oldMyInfo) {
        const oldInfo = JSON.parse(oldMyInfo);

        const migratedInfo: PersonInfo = {
          relation: "본인",
          name: oldInfo.name || "",
          birth: oldInfo.birth || "",
          gender: oldInfo.gender || "",
          bloodType: oldInfo.bloodType || "",
          disease: oldInfo.disease || "",
          medicine: oldInfo.medicine || "",
          allergy: oldInfo.allergy || "",
          guardianName: oldInfo.guardianName || "",
          guardianPhone: oldInfo.guardianPhone || "",
          memo: oldInfo.memo || "",
        };

        await AsyncStorage.setItem("myInfoList", JSON.stringify([migratedInfo]));
        setPersonList([migratedInfo]);
        setSelectedIndex(0);
        setIsEditMode(false);
        return;
      }

      startAddPerson();
    } catch (error) {
      console.log("내 정보 목록 불러오기 실패:", error);
      startAddPerson();
    }
  };

  const formatBirthDate = (text: string) => {
    const numbersOnly = text.replace(/[^0-9]/g, "");

    if (numbersOnly.length <= 4) {
      return numbersOnly;
    }

    if (numbersOnly.length <= 6) {
      return `${numbersOnly.slice(0, 4)}-${numbersOnly.slice(4)}`;
    }

    return `${numbersOnly.slice(0, 4)}-${numbersOnly.slice(
      4,
      6
    )}-${numbersOnly.slice(6, 8)}`;
  };

  const handleBirthChange = (text: string) => {
    setBirth(formatBirthDate(text));
  };

  const formatPhoneNumber = (text: string) => {
    const numbersOnly = text.replace(/[^0-9]/g, "");

    if (numbersOnly.length <= 3) {
      return numbersOnly;
    }

    if (numbersOnly.length <= 7) {
      return `${numbersOnly.slice(0, 3)}-${numbersOnly.slice(3)}`;
    }

    return `${numbersOnly.slice(0, 3)}-${numbersOnly.slice(
      3,
      7
    )}-${numbersOnly.slice(7, 11)}`;
  };

  const handleGuardianPhoneChange = (text: string) => {
    setGuardianPhone(formatPhoneNumber(text));
  };

  const setFormData = (person: PersonInfo) => {
    setRelation(person.relation || "");
    setName(person.name || "");
    setBirth(person.birth || "");
    setGender(person.gender || "");
    setBloodType(person.bloodType || "");
    setDisease(person.disease || "");
    setMedicine(person.medicine || "");
    setAllergy(person.allergy || "");
    setGuardianName(person.guardianName || "");
    setGuardianPhone(person.guardianPhone || "");
    setMemo(person.memo || "");
  };

  const resetForm = () => {
    setFormData(emptyPerson);
  };

  const startAddPerson = () => {
    resetForm();
    setEditingIndex(null);
    setIsEditMode(true);
  };

  const startEditPerson = () => {
    const selectedPerson = personList[selectedIndex];

    if (!selectedPerson) {
      return;
    }

    setFormData(selectedPerson);
    setEditingIndex(selectedIndex);
    setIsEditMode(true);
  };

  const savePersonInfo = async () => {
    const personInfo: PersonInfo = {
      relation,
      name,
      birth,
      gender,
      bloodType,
      disease,
      medicine,
      allergy,
      guardianName,
      guardianPhone,
      memo,
    };

    if (!relation) {
      Alert.alert("입력 필요", "관계를 선택해주세요.");
      return;
    }

    if (!name) {
      Alert.alert("입력 필요", "이름을 입력해주세요.");
      return;
    }

    try {
      let newList: PersonInfo[] = [];

      if (editingIndex === null) {
        newList = [...personList, personInfo];
        setSelectedIndex(newList.length - 1);
      } else {
        newList = personList.map((person, index) =>
          index === editingIndex ? personInfo : person
        );
        setSelectedIndex(editingIndex);
      }

      await AsyncStorage.setItem("myInfoList", JSON.stringify(newList));

      setPersonList(newList);
      setIsEditMode(false);
      setEditingIndex(null);

      Alert.alert("저장 완료", "내 정보가 저장되었습니다.");
    } catch (error) {
      console.log("내 정보 저장 실패:", error);
      Alert.alert("저장 실패", "내 정보를 저장하지 못했습니다.");
    }
  };

  const deleteSelectedPerson = async () => {
    if (personList.length === 0) {
      return;
    }

    Alert.alert("삭제 확인", "선택한 정보를 삭제할까요?", [
      {
        text: "취소",
        style: "cancel",
      },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            const newList = personList.filter(
              (_, index) => index !== selectedIndex
            );

            await AsyncStorage.setItem("myInfoList", JSON.stringify(newList));

            setPersonList(newList);
            setSelectedIndex(0);

            if (newList.length === 0) {
              startAddPerson();
            }
          } catch (error) {
            console.log("내 정보 삭제 실패:", error);
            Alert.alert("삭제 실패", "내 정보를 삭제하지 못했습니다.");
          }
        },
      },
    ]);
  };

  const selectedPerson = personList[selectedIndex];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <FontAwesome6 name="chevron-left" size={20} color="#111827" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>내 정보</Text>

        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isEditMode ? (
          <EditView
            relation={relation}
            name={name}
            birth={birth}
            gender={gender}
            bloodType={bloodType}
            disease={disease}
            medicine={medicine}
            allergy={allergy}
            guardianName={guardianName}
            guardianPhone={guardianPhone}
            memo={memo}
            setRelation={setRelation}
            setName={setName}
            setBirth={handleBirthChange}
            setGender={setGender}
            setBloodType={setBloodType}
            setDisease={setDisease}
            setMedicine={setMedicine}
            setAllergy={setAllergy}
            setGuardianName={setGuardianName}
            setGuardianPhone={handleGuardianPhoneChange}
            setMemo={setMemo}
            savePersonInfo={savePersonInfo}
            cancelEdit={() => {
              if (personList.length === 0) {
                router.back();
                return;
              }

              setIsEditMode(false);
              setEditingIndex(null);
            }}
            isNewPerson={editingIndex === null}
          />
        ) : (
          <DetailView
            personList={personList}
            selectedIndex={selectedIndex}
            selectedPerson={selectedPerson}
            onSelectPerson={setSelectedIndex}
            onAddPerson={startAddPerson}
            onEditPerson={startEditPerson}
            onDeletePerson={deleteSelectedPerson}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type EditViewProps = {
  relation: string;
  name: string;
  birth: string;
  gender: string;
  bloodType: string;
  disease: string;
  medicine: string;
  allergy: string;
  guardianName: string;
  guardianPhone: string;
  memo: string;

  setRelation: (text: string) => void;
  setName: (text: string) => void;
  setBirth: (text: string) => void;
  setGender: (text: string) => void;
  setBloodType: (text: string) => void;
  setDisease: (text: string) => void;
  setMedicine: (text: string) => void;
  setAllergy: (text: string) => void;
  setGuardianName: (text: string) => void;
  setGuardianPhone: (text: string) => void;
  setMemo: (text: string) => void;

  savePersonInfo: () => void;
  cancelEdit: () => void;
  isNewPerson: boolean;
};

function EditView(props: EditViewProps) {
  return (
    <>
      <Text style={styles.description}>
        응급 상황에서 의료진이나 보호자에게 전달할 기본 정보를 입력해주세요.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>대상 정보</Text>

        <SelectButtonGroup
          label="관계"
          value={props.relation}
          options={["본인", "엄마", "아빠", "가족", "배우자", "자녀", "형제", "친구", "기타"]}
          onSelect={props.setRelation}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>기본 정보</Text>

        <Input
          label="이름"
          value={props.name}
          onChangeText={props.setName}
          placeholder="홍길동"
        />

        <Input
          label="생년월일"
          value={props.birth}
          onChangeText={props.setBirth}
          placeholder="1995-01-01"
          keyboardType="phone-pad"
        />

        <SelectButtonGroup
          label="성별"
          value={props.gender}
          options={["남", "여"]}
          onSelect={props.setGender}
        />

        <SelectButtonGroup
          label="혈액형"
          value={props.bloodType}
          options={["A형", "B형", "O형", "AB형"]}
          onSelect={props.setBloodType}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>건강 정보</Text>

        <Input
          label="기저질환"
          value={props.disease}
          onChangeText={props.setDisease}
          placeholder="고혈압, 당뇨 등"
          multiline
        />

        <Input
          label="복용약"
          value={props.medicine}
          onChangeText={props.setMedicine}
          placeholder="현재 복용 중인 약"
          multiline
        />

        <Input
          label="알레르기"
          value={props.allergy}
          onChangeText={props.setAllergy}
          placeholder="약물, 음식 알레르기 등"
          multiline
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>보호자 정보</Text>

        <Input
          label="보호자 이름"
          value={props.guardianName}
          onChangeText={props.setGuardianName}
          placeholder="보호자 이름"
        />

        <Input
          label="보호자 연락처"
          value={props.guardianPhone}
          onChangeText={props.setGuardianPhone}
          placeholder="010-0000-0000"
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>응급 메모</Text>

        <Input
          label="메모"
          value={props.memo}
          onChangeText={props.setMemo}
          placeholder="응급 상황에서 꼭 알려야 할 내용"
          multiline
        />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={props.savePersonInfo}>
        <Text style={styles.saveButtonText}>
          {props.isNewPerson ? "추가하기" : "저장하기"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={props.cancelEdit}>
        <Text style={styles.cancelButtonText}>취소</Text>
      </TouchableOpacity>
    </>
  );
}

type DetailViewProps = {
  personList: PersonInfo[];
  selectedIndex: number;
  selectedPerson?: PersonInfo;
  onSelectPerson: (index: number) => void;
  onAddPerson: () => void;
  onEditPerson: () => void;
  onDeletePerson: () => void;
};

function DetailView({
  personList,
  selectedIndex,
  selectedPerson,
  onSelectPerson,
  onAddPerson,
  onEditPerson,
  onDeletePerson,
}: DetailViewProps) {
  if (!selectedPerson) {
    return (
      <>
        <Text style={styles.description}>등록된 내 정보가 없습니다.</Text>

        <TouchableOpacity style={styles.saveButton} onPress={onAddPerson}>
          <Text style={styles.saveButtonText}>내 정보 추가하기</Text>
        </TouchableOpacity>
      </>
    );
  }

  return (
    <>
      <Text style={styles.description}>
        여러 명의 응급 정보를 등록하고 필요한 대상을 선택할 수 있습니다.
      </Text>

      <View style={styles.personSelectSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {personList.map((person, index) => (
            <TouchableOpacity
              key={`${person.relation}-${person.name}-${index}`}
              style={[
                styles.personChip,
                selectedIndex === index && styles.personChipActive,
              ]}
              onPress={() => onSelectPerson(index)}
            >
              <Text
                style={[
                  styles.personChipText,
                  selectedIndex === index && styles.personChipTextActive,
                ]}
              >
                {person.relation || "관계"} {person.name || "이름"}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.addChip} onPress={onAddPerson}>
            <Text style={styles.addChipText}>+ 추가</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {selectedPerson.relation} {selectedPerson.name}
        </Text>

        <InfoRow label="관계" value={selectedPerson.relation} />
        <InfoRow label="이름" value={selectedPerson.name} />
        <InfoRow label="생년월일" value={selectedPerson.birth} />
        <InfoRow label="성별" value={selectedPerson.gender} />
        <InfoRow label="혈액형" value={selectedPerson.bloodType} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>건강 정보</Text>

        <InfoRow label="기저질환" value={selectedPerson.disease} />
        <InfoRow label="복용약" value={selectedPerson.medicine} />
        <InfoRow label="알레르기" value={selectedPerson.allergy} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>보호자 정보</Text>

        <InfoRow label="보호자 이름" value={selectedPerson.guardianName} />
        <InfoRow label="보호자 연락처" value={selectedPerson.guardianPhone} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>응급 메모</Text>

        <InfoRow label="메모" value={selectedPerson.memo} />
      </View>

      <TouchableOpacity style={styles.editButton} onPress={onEditPerson}>
        <Text style={styles.editButtonText}>수정하기</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteButton} onPress={onDeletePerson}>
        <Text style={styles.deleteButtonText}>삭제하기</Text>
      </TouchableOpacity>
    </>
  );
}

type InputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "phone-pad";
};

function Input({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = "default",
}: InputProps) {
  return (
    <View style={styles.inputBox}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#999"
        multiline={multiline}
        keyboardType={keyboardType}
      />
    </View>
  );
}

type SelectButtonGroupProps = {
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
};

function SelectButtonGroup({
  label,
  value,
  options,
  onSelect,
}: SelectButtonGroupProps) {
  return (
    <View style={styles.inputBox}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.selectButtonWrap}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.selectButton,
              value === option && styles.selectButtonActive,
            ]}
            onPress={() => onSelect(option)}
          >
            <Text
              style={[
                styles.selectButtonText,
                value === option && styles.selectButtonTextActive,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

type InfoRowProps = {
  label: string;
  value: string;
};

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || "미입력"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backText: {
    fontSize: 34,
    color: "#222",
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#222",
  },

  description: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 20,
  },

  personSelectSection: {
    marginBottom: 16,
  },

  personChip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },

  personChipActive: {
    backgroundColor: "#E53935",
    borderColor: "#E53935",
  },

  personChipText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#555",
  },

  personChipTextActive: {
    color: "#FFFFFF",
  },

  addChip: {
    backgroundColor: "#222",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginRight: 8,
  },

  addChipText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#222",
    marginBottom: 14,
  },

  inputBox: {
    marginBottom: 14,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },

  input: {
    backgroundColor: "#F2F3F5",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#222",
  },

  textArea: {
    height: 90,
    textAlignVertical: "top",
  },

  selectButtonWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  selectButton: {
    backgroundColor: "#F2F3F5",
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#F2F3F5",
  },

  selectButtonActive: {
    backgroundColor: "#FFECEC",
    borderColor: "#E53935",
  },

  selectButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#555",
  },

  selectButtonTextActive: {
    color: "#E53935",
  },

  infoRow: {
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },

  infoLabel: {
    fontSize: 13,
    color: "#777",
    marginBottom: 4,
  },

  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222",
    lineHeight: 21,
  },

  saveButton: {
    backgroundColor: "#E53935",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },

  editButton: {
    backgroundColor: "#222",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },

  editButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },

  cancelButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#DDDDDD",
  },

  cancelButtonText: {
    color: "#555",
    fontSize: 16,
    fontWeight: "700",
  },

  deleteButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E53935",
  },

  deleteButtonText: {
    color: "#E53935",
    fontSize: 16,
    fontWeight: "700",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },

  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
});
