import mongoose from 'mongoose';

const raw_machine_data_schema = new mongoose.Schema(
  {
    ItemSrNo: {
      type: Number,
      required: [true, 'Item Sr No is Required'],
    },
    Identificador: {
      type: String,
      default: null,
    },
    Fecha: {
      type: Date,
      required: [true, 'Fecha is required'],
      // set: (val) => new Date((val - 25569) * 86400 * 1000)
    },
    DressingDate: {
      type: Date,
      required: [true, 'Dressing Date is required'],
    },
    Tronco: {
      type: String,
      required: [true, 'Tronco is required.'],
      trim: true,
    },
    Especie: {
      type: String,
      required: [true, 'Especie is required'],
      trim: true,
    },
    //length
    Largo: {
      type: Number,
      required: [true, 'Largo is required.'],
    },
    //width
    Ancho: {
      type: Number,
      required: [true, 'Ancho is required'],
    },
    //thickness
    Grosor: {
      type: Number,
      required: [true, 'Grosor is required'],
    },
    //no of leaves
    Hojas: {
      type: Number,
      required: [true, 'Hojas is required'],
    },
    //sqm
    M2: {
      type: Number,
      required: [true, 'M2 is required'],
    },
    //Bundle Number
    NumPaqTronco: {
      type: Number,
      required: [true, 'NumPaqTronco is required'],
    },
    //pallet number
    Partida: {
      type: String,
      required: [true, 'Partida is required'],
    },
    DtoLargo: {
      type: Number,
      default: 0,
    },
    DtoAncho: {
      type: Number,
      default: 0,
    },
    Pieza: {
      type: Number,
      default: 0,
    },
    Palo: {
      type: Number,
      default: 0,
    },
    Cara: {
      type: Number,
      default: 0,
    },
    FichPalet: {
      type: Number,
      default: 0,
    },
    Palet: {
      type: Number,
      default: 0,
    },
    DtoHojas: {
      type: Number,
      default: 0,
    },
    CodCri1: {
      type: Number,
      default: 0,
    },
    CodCri2: {
      type: Number,
      default: 0,
    },
    CodCri3: {
      type: Number,
      default: 0,
    },
    CodCri4: {
      type: Number,
      default: 0,
    },
    Criterio1: {
      type: String,
      default: null,
      trim: true,
    },
    Criterio2: {
      type: String,
      default: null,
      trim: true,
    },
    Criterio3: {
      type: String,
      default: null,
      trim: true,
    },
    Criterio4: {
      type: String,
      default: null,
      trim: true,
    },
    Proveedor: {
      type: String,
      default: null,
      trim: true,
    },
    Cliente: {
      type: String,
      default: null,
      trim: true,
    },
    Ubicacion: {
      type: Number,
      default: 0,
    },
    NumPaquete: {
      type: Number,
      default: 0,
    },
    Operario: {
      type: String,
      trim: true,
      default: null,
    },
    Linea: {
      type: String,
      trim: true,
      default: null,
    },
    Turno: {
      type: String,
      trim: true,
      default: null,
    },
    IdSollado: {
      type: Number,
      default: 0,
    },
    Sollado: {
      type: Number,
      default: 0,
    },
    FichClasif: {
      type: Number,
      default: 0,
    },
    SolladoCerrado: {
      type: String,
      default: null,
      trim: true,
    },
    Transferido: {
      type: String,
      default: null,
      trim: true,
    },
    Vendido: {
      type: String,
      default: null,
      trim: true,
    },
    Albaran: {
      type: Number,
      default: 0,
    },
    CodProveedor: {
      type: Number,
      default: 0,
    },
    Borrado: {
      type: String,
      default: null,
      trim: true,
    },
    Precio: {
      type: String,
      default: null,
      trim: true,
    },
    NsisAlb: {
      type: Number,
      default: 0,
    },
    CodCliente: {
      type: Number,
      default: 0,
    },
    PseudoSollado: {
      type: Number,
      default: 0,
    },
    Devolucion: {
      type: String,
      default: null,
      trim: true,
    },
    AnchoAux: {
      type: Number,
      default: 0,
    },
    Orden: {
      type: String,
      default: null,
      trim: true,
    },
    Campo1: {
      type: String,
      trim: true,
      default: null,
    },
    Campo2: {
      type: String,
      trim: true,
      default: null,
    },
    Campo3: {
      type: String,
      trim: true,
      default: null,
    },
    PseudoClave: {
      type: Number,
      default: 0,
    },
    status: {
      type: Boolean,
      default: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Created By is required'],
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Updatd By is required'],
    },
  },
  { timestamps: true }
);

raw_machine_data_schema.index(
  { DressingDate: 1, Identificador: 1 },
  { unique: true }
);
raw_machine_data_schema.index(
  { Tronco: 1, Partida: 1, NumPaqTronco: 1 },
  { unique: true }
);
raw_machine_data_schema.index({ DressingDate: 1 });
// raw_machine_data_schema.pre('save', async function (next) {
//   console.log("called 🦿")
//   this.DressingDate = this.Fecha.toISOString().split('T')[0];

//   try {
//     const max_sr_no = await mongoose
//       .model('dressing_machine_raw_data')
//       .findOne({ DressingDate: this.DressingDate })
//       .sort({ ItemSrNo: -1 })
//       .select('ItemSrNo');

//     this.ItemSrNo = max_sr_no ? max_sr_no?.ItemSrNo + 1 : 1;
//     next();
//   } catch (error) {
//     next(error)
//   }
// });

const dressing_raw_machine_data_model = mongoose.model(
  'dressing_machine_raw_data',
  raw_machine_data_schema,
  'dressing_machine_raw_data'
);

export default dressing_raw_machine_data_model;
