// Slices/auth.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  token: localStorage.getItem("token") || null, // Optionally load token from localStorage directly
  Merchant_token: localStorage.getItem("Merchanttoken") || null, // Optionally load token from localStorage directly
  superadmintoken: localStorage.getItem("superadmintoken"), // Optionally load token from localStorage directly
  Customer_userId: null,
  Unique_UserID : null,
  Merchant_userId : null,
  email: null,
  password: null,
  Profileimage: null,
  name: null,
  phone: null,
  AreaPin : null,
  Location : {
    Latitude : '',
    Longitude : ''
  },
  registered: false,
  Merchant_registered: false,
  loginpageActive: false,
    referral_code: "",
  mobile_login_pageActive: false,
  address: [],
  pan : {
    PanName : '',
    PanNumber : ''
  },
  userlogin : null,
  superadminlogin : null,
  marchantlogin : null,

};

const LoginSignUpSlice = createSlice({
  name: "LoginSignUpSlice",
  initialState,
  reducers: {
    signup(state, action) {
         (action.payload);
      state.token = action.payload.token;
      state.Customer_userId = action.payload.userId;
      state.email = action.payload.email;
      state.name = action.payload.name;
      state.phone = action.payload.phone;

    },

    ImportUserDeatils(state, action) {
      state.Customer_userId = action.payload.Customer_userId;
      state.loginpageActive = action.payload.login;

            state.referral_code = action.payload.referral_code;

      state.Unique_UserID = action.payload.Unique_UserID;
      state.registered = action.payload.registered;

      state.email = action.payload.email;
      state.name = action.payload.name;
      state.phone = action.payload.phone;
      state.userlogin = action.payload.userlogin;
      state.mobile_login_pageActive = action.payload.mobile_login_pageActive;

    },


    signIn(state, action) {
         (action.payload);
      state.token = action.payload.token;
      state.Customer_userId = action.payload.Customer_userId;
      state.loginpageActive = action.payload.login;

      state.Unique_UserID = action.payload.Unique_UserID;
      state.registered = action.payload.registered;

      state.email = action.payload.email;
      state.name = action.payload.name;
      state.phone = action.payload.phone;
      state.userlogin = action.payload.userlogin;
      state.mobile_login_pageActive = action.payload.mobile_login_pageActive;

    },
    logout(state) {
      localStorage.clear();
      state.token = null;
      state.Customer_userId = null;
      state.email = null;
      state.password = null;
      state.Profileimage = null;
      state.name = null;
      state.registered = false;
      state.loginpageActive = false;
      state.signupPageActive = false;
    },
    updateName(state, action) {
         (action);
      state.name = action.payload;
    },
    updateNumber(state, action) {
         (action);
      state.phone = action.payload;
    },
    updateEmail(state, action) {
         (action);
      state.email = action.payload;
    },
    updateToken(state, action) {
         (action);

      if(action.payload === "marchanttoken"){

           (action.payload.role);
           (action.payload.id);

        

        state.admintoken = action.payload.role;
        state.Merchant_userId = action.payload.id;

        // Merchant_userId


      }
      // else if(action.payload === "superadmintoken"){

      //   state.superadmintoken = action.payload;


      // }
      // else if(action.payload === "token"){

      //   state.token = action.payload;

      // }
      // else{

      //   state.admintoken = null;
      //   state.superadmintoken = null;
      //   state.token = null;


      // }
  
    },
    MerchantLogout(state, action) {

      state.Merchant_token = null;
      state.Merchant_userId = null;
      state.Merchant_registered = false,
      state.marchantlogin = null


    
  
    },
    updateAdministrator(state, action) {
         (action);

   
        

        state.Merchant_token = action.payload.role;
        state.Merchant_userId = action.payload.id;
        state.Merchant_registered = action.payload.Merchant_registered;

        // Merchant_userId




        // state.superadmintoken = action.payload;



      // else if(action.payload === "token"){

      //   state.token = action.payload;

      // }
      // else{

      //   state.admintoken = null;
      //   state.superadmintoken = null;
      //   state.token = null;


      // }
  
    },
    activePages(state, action) {
         (action);
      state.loginpageActive = action.payload.login;
    },

    activeMobileLoginPages(state, action) {
         (action);
      state.mobile_login_pageActive = action.payload.login;
    },


    registered(state, action) {
      state.registered = action.payload;
    },

    Merchant_registered(state, action) {
      state.Merchant_registered = action.payload;
    },

    addAddress(state, action) {
      state.address = action.payload;
    },
    addSingleAddress(state, action) {
      state.address.unshift(action.payload);
    },
    modifyAddress(state, action) {
         (action);
      const index = state.address.findIndex(
        (addr) => addr.id === action.payload.id
      );
      if (index !== -1) {
        state.address[index] = action.payload;
      }
    },
    removeAddress(state, action) {
      state.address = state.address.filter(
        (addr) => addr.id !== action.payload
      );
    },

    updatePan(state, action) {
         (action);
      state.pan = action.payload;
    },
    updateAreaPin(state, action) {
         (action);
      state.AreaPin = action.payload.pincode;
    },
    role(state, action){
         (action);

      if(action.payload === "Marchant"){
        state.marchantlogin = true
      }
      else if(action.payload === "superadmin"){
        state.superadminlogin = true
      }
      else{
           ("role problem");
        
      }

     
      
    },
    setLat_Long_Location(state, action){


      state.Location ={


    Latitude : action.payload.Latitude,
    Longitude : action.payload.Longitude


      }

     
      
    },

  },
});

export const {
  role,
  updatePan,
  addSingleAddress,
  removeAddress,
  modifyAddress,
  addAddress,
  signup,
  signIn,
  MerchantLogout,
  activeMobileLoginPages,
  updateAdministrator,
  logout,
  updateNumber,
  updateToken,
  activePages,
  registered,
  Merchant_registered,
  updateEmail,
  updateName,
  updateAreaPin,
  setLat_Long_Location,
  ImportUserDeatils
} = LoginSignUpSlice.actions;

export const LoginSignUpSlicee = LoginSignUpSlice.reducer;
